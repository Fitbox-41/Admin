// FitBox App management — analytics + user/challenge/territory/push controls for
// the mobile app, all on the shared Atlas DB. Read-only aggregations query the
// app's collections directly; challenge CRUD and push send are proxied to the
// app backend (single writer / single FCM sender) using the shared service key.
import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';

const router = express.Router();

const APP_API_BASE = process.env.APP_API_BASE || 'https://fit-box-app.vercel.app';
const SERVICE_KEY = process.env.WALLET_SERVICE_KEY || '';

const coll = (name) => mongoose.connection.db.collection(name);

// ISO year-week, e.g. "2026-W31" — mirrors the app backend's territory season.
function currentSeason(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = date.getTime();
  date.setUTCMonth(0, 1);
  if (date.getUTCDay() !== 4) {
    date.setUTCMonth(0, 1 + ((4 - date.getUTCDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - date.getTime()) / 604800000);
  const year = new Date(firstThursday).getUTCFullYear();
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function seasonEndsAt(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysToMon = ((8 - d.getUTCDay()) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + daysToMon);
  return d.toISOString();
}

const appHeaders = () => ({ 'X-Service-Key': SERVICE_KEY });

function forwardError(err, res) {
  if (err.response) {
    return res.status(err.response.status).json(err.response.data);
  }
  console.error('App upstream error:', err.message);
  return res.status(502).json({ success: false, message: 'App backend unreachable' });
}

// ---- Analytics overview ---------------------------------------------------
router.get('/analytics', async (req, res) => {
  try {
    const season = currentSeason();
    const since = new Date(Date.now() - 13 * 86400000); // last 14 days incl. today

    const [
      appFieldUsers,
      runUserIds,
      terrUserIds,
      pushUsers,
      runStats,
      dailyRuns,
      econ,
      outstanding,
      activeChallenges,
      totalChallenges,
      totalJoins,
      totalClaims,
      territories,
    ] = await Promise.all([
      coll('users')
        .find(
          { $or: [{ lastAppLoginAt: { $exists: true } }, { fcmTokens: { $exists: true, $ne: [] } }] },
          { projection: { _id: 1 } },
        )
        .toArray(),
      coll('runs').distinct('userId'),
      coll('territories').distinct('userId'),
      coll('users').countDocuments({ fcmTokens: { $exists: true, $ne: [] } }),
      coll('runs')
        .aggregate([
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              distance: { $sum: '$distance' },
              duration: { $sum: '$duration' },
              steps: { $sum: '$steps' },
            },
          },
        ])
        .toArray(),
      coll('runs')
        .aggregate([
          { $match: { startedAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
              count: { $sum: 1 },
              distance: { $sum: '$distance' },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      coll('wallet_transactions')
        .aggregate([
          {
            $group: {
              _id: { type: '$type', source: '$source' },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      coll('users').aggregate([{ $group: { _id: null, total: { $sum: '$walletBalance' } } }]).toArray(),
      coll('challenges').countDocuments({ active: true }),
      coll('challenges').countDocuments({}),
      coll('challenge_progress').countDocuments({}),
      coll('challenge_progress').countDocuments({ claimed: true }),
      coll('territories').find({ season, area: { $gt: 0 } }).toArray(),
    ]);

    // App users = signed in on the app (stamped) OR have an app-only footprint.
    const appUserSet = new Set([
      ...appFieldUsers.map((u) => String(u._id)),
      ...runUserIds.map(String),
      ...terrUserIds.map(String),
    ]);
    const appUserCount = appUserSet.size;

    const rs = runStats[0] || {};
    const econByType = { credit: 0, debit: 0 };
    const bySource = {};
    for (const e of econ) {
      econByType[e._id.type] = (econByType[e._id.type] || 0) + e.total;
      const key = e._id.source || 'other';
      bySource[key] = (bySource[key] || 0) + e.total;
    }

    const leaders = territories
      .map((t) => ({ userName: t.userName || 'Runner', area: Math.round(t.area || 0) }))
      .sort((a, b) => b.area - a.area)
      .slice(0, 10);

    res.json({
      success: true,
      users: { total: appUserCount, withPush: pushUsers },
      runs: {
        count: rs.count || 0,
        distanceKm: Math.round((rs.distance || 0) / 1000),
        durationHr: Math.round((rs.duration || 0) / 3600),
        steps: rs.steps || 0,
        daily: dailyRuns.map((d) => ({
          date: d._id,
          runs: d.count,
          distanceKm: Math.round(((d.distance || 0) / 1000) * 10) / 10,
        })),
      },
      points: {
        valueInr: 0.1,
        outstanding: Math.round((outstanding[0] && outstanding[0].total) || 0),
        earned: Math.round(econByType.credit || 0),
        redeemed: Math.round(econByType.debit || 0),
        bySource,
      },
      challenges: {
        active: activeChallenges,
        total: totalChallenges,
        joins: totalJoins,
        claims: totalClaims,
      },
      territory: {
        season,
        seasonEndsAt: seasonEndsAt(),
        holders: territories.length,
        leaders,
      },
    });
  } catch (error) {
    console.error('App analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---- App users ------------------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const season = currentSeason();
    const users = await coll('users')
      .find(
        {},
        {
          projection: {
            name: 1, email: 1, walletBalance: 1, createdAt: 1,
            fcmTokens: 1, lastAppLoginAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(2000)
      .toArray();

    const ids = users.map((u) => u._id);
    const [runAgg, terr] = await Promise.all([
      coll('runs')
        .aggregate([
          { $match: { userId: { $in: ids } } },
          { $group: { _id: '$userId', runs: { $sum: 1 }, distance: { $sum: '$distance' } } },
        ])
        .toArray(),
      coll('territories').find({ season, userId: { $in: ids } }).toArray(),
    ]);

    const runMap = new Map(runAgg.map((r) => [String(r._id), r]));
    const terrMap = new Map(terr.map((t) => [String(t.userId), t]));

    const rows = users
      .map((u) => {
        const r = runMap.get(String(u._id));
        const t = terrMap.get(String(u._id));
        return {
          _id: u._id,
          name: u.name || 'Runner',
          email: u.email || '',
          points: u.walletBalance || 0,
          runs: r ? r.runs : 0,
          distanceKm: r ? Math.round(((r.distance || 0) / 1000) * 10) / 10 : 0,
          territoryArea: t ? Math.round(t.area || 0) : 0,
          pushRegistered: !!(u.fcmTokens && u.fcmTokens.length),
          joined: u.createdAt,
          // App user = signed in on the app (stamped) OR has app-only footprint
          // (device token / recorded runs / territory) — the latter backfills
          // users from before login-stamping existed.
          _isAppUser:
            !!u.lastAppLoginAt ||
            !!(u.fcmTokens && u.fcmTokens.length) ||
            (r && r.runs > 0) ||
            (t && (t.area || 0) > 0),
        };
      })
      .filter((u) => u._isAppUser)
      .map(({ _isAppUser, ...u }) => u);

    res.json({ success: true, users: rows });
  } catch (error) {
    console.error('App users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---- Challenges CRUD (proxied to the app backend admin endpoints) ---------
router.get('/challenges', async (req, res) => {
  try {
    const r = await axios.get(`${APP_API_BASE}/api/challenges/admin/all`, { headers: appHeaders() });
    res.json(r.data);
  } catch (err) {
    forwardError(err, res);
  }
});

router.post('/challenges', async (req, res) => {
  try {
    const r = await axios.post(`${APP_API_BASE}/api/challenges/admin`, req.body, {
      headers: appHeaders(),
    });
    res.json(r.data);
  } catch (err) {
    forwardError(err, res);
  }
});

router.put('/challenges/:id', async (req, res) => {
  try {
    const r = await axios.put(
      `${APP_API_BASE}/api/challenges/admin/${req.params.id}`,
      req.body,
      { headers: appHeaders() },
    );
    res.json(r.data);
  } catch (err) {
    forwardError(err, res);
  }
});

router.delete('/challenges/:id', async (req, res) => {
  try {
    const r = await axios.delete(`${APP_API_BASE}/api/challenges/admin/${req.params.id}`, {
      headers: appHeaders(),
    });
    res.json(r.data);
  } catch (err) {
    forwardError(err, res);
  }
});

// ---- Push (proxied to the app backend FCM sender) -------------------------
router.get('/push/status', async (req, res) => {
  try {
    const r = await axios.get(`${APP_API_BASE}/api/push/status`);
    res.json(r.data);
  } catch (err) {
    forwardError(err, res);
  }
});

router.post('/push/send', async (req, res) => {
  try {
    const r = await axios.post(`${APP_API_BASE}/api/push/send`, req.body, {
      headers: appHeaders(),
    });
    res.json(r.data);
  } catch (err) {
    forwardError(err, res);
  }
});

export default router;
