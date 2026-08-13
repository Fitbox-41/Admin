import { useState, useEffect } from 'react';
import { Coins, Percent, Trophy, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Fallbacks, only used until settings load. The server is the authority.
const DEFAULT_POINT_VALUE_INR = 0.1;
const DEFAULT_REDEEM_CAP_PERCENT = 10;
const DEFAULT_SEASON_TOP_REWARD_INR = 200;
const PAID_PLACES = 20;

// Mirrors backend/seasonRewards.js: first place takes the configured award and
// every place below scales down by rank. Preview only — the backend remains the
// authority when a season actually settles.
const rankWeight = (rank) => 1 / Math.pow(rank, 0.8);

const previewPrizeTable = (topRewardInr) => {
  const top = Number(topRewardInr);
  if (!Number.isFinite(top) || top < 0) return { rows: [], total: 0 };
  // Assumes an evenly matched field, which is the most a season can cost.
  const rows = Array.from({ length: PAID_PLACES }, (_, i) => ({
    rank: i + 1,
    inr: top * (rankWeight(i + 1) / rankWeight(1)),
  }));
  return { rows, total: rows.reduce((sum, r) => sum + r.inr, 0) };
};

/// The points economy: what a point is worth, how much of an order it can cover,
/// and what winning a weekly territory season pays.
///
/// These live on the shared settings document and are read at runtime by the
/// website checkout, the mobile app and the analytics liability figure — so a
/// change here applies everywhere with no deploy and no app release.
const PointsSettings = () => {
  const [pointValueInr, setPointValueInr] = useState(DEFAULT_POINT_VALUE_INR);
  const [redeemCapPercent, setRedeemCapPercent] = useState(DEFAULT_REDEEM_CAP_PERCENT);
  const [seasonTopRewardInr, setSeasonTopRewardInr] = useState(DEFAULT_SEASON_TOP_REWARD_INR);
  // The rate currently in force, so a change can be judged before saving —
  // editing the value re-prices every outstanding balance at once.
  const [savedPointValue, setSavedPointValue] = useState(DEFAULT_POINT_VALUE_INR);
  const [outstandingPoints, setOutstandingPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();
        if (data) {
          if (Number(data.pointValueInr) > 0) {
            setPointValueInr(data.pointValueInr);
            setSavedPointValue(Number(data.pointValueInr));
          }
          // 0 is valid for both of these (redemption or prizes switched off).
          if (data.redeemCapPercent !== undefined && data.redeemCapPercent !== null) {
            setRedeemCapPercent(data.redeemCapPercent);
          }
          if (data.seasonTopRewardInr !== undefined && data.seasonTopRewardInr !== null) {
            setSeasonTopRewardInr(data.seasonTopRewardInr);
          }
        }
      } catch (err) {
        console.error('Error fetching points settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();

    const loadLiability = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/app/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const pts = data?.points?.outstanding;
        if (Number.isFinite(Number(pts))) setOutstandingPoints(Number(pts));
      } catch (err) {
        console.error('Error fetching points liability:', err);
      }
    };
    loadLiability();
  }, []);

  const handleSave = async () => {
    const value = Number(pointValueInr);
    const cap = Number(redeemCapPercent);
    const topReward = Number(seasonTopRewardInr);
    if (!Number.isFinite(value) || value <= 0) {
      alert('Point value must be greater than 0.');
      return;
    }
    if (!Number.isFinite(cap) || cap < 0 || cap > 100) {
      alert('Redemption limit must be between 0 and 100 percent.');
      return;
    }
    if (!Number.isFinite(topReward) || topReward < 0) {
      alert('Weekly top reward must be 0 or more.');
      return;
    }
    // Changing the rate re-prices every point already issued, so make the
    // consequence explicit rather than letting it happen quietly.
    if (value !== savedPointValue && outstandingPoints !== null) {
      const before = (outstandingPoints * savedPointValue).toFixed(2);
      const after = (outstandingPoints * value).toFixed(2);
      const ok = window.confirm(
        'This changes the value of every point already issued.\n\n' +
        `${outstandingPoints.toLocaleString()} points outstanding\n` +
        `Now:   ₹${before}  (at ₹${savedPointValue})\n` +
        `After: ₹${after}  (at ₹${value})\n\nSave anyway?`
      );
      if (!ok) return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pointValueInr: value,
          redeemCapPercent: cap,
          seasonTopRewardInr: topReward,
        }),
      });
      if (res.ok) {
        setSavedPointValue(value);
        alert('Points settings saved');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to save points settings');
      }
    } catch (err) {
      console.error('Error saving points settings:', err);
      alert('Error saving points settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-mid py-10 justify-center">
        <Loader2 size={18} className="animate-spin" /> Loading points settings…
      </div>
    );
  }

  const { rows, total } = previewPrizeTable(seasonTopRewardInr);
  const shown = [0, 1, 2, 4, 9, 19]; // ranks 1, 2, 3, 5, 10, 20

  return (
    <div className="glass p-6 md:p-8 rounded-xl w-full space-y-6">
      <div>
        <h3 className="font-bold mb-2 text-text-dark text-lg border-b border-border pb-2">
          Points Economy
        </h3>
        <p className="text-sm text-text-mid">
          Applies everywhere at once — the mobile app, website checkout and the published
          Terms &amp; Conditions. No app update needed.
        </p>
      </div>

      <div className="space-y-6">
        {/* Point value */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary">
              <Coins size={18} />
            </div>
            <div>
              <p className="font-medium text-text-dark">Point Value (₹ per point)</p>
              <p className="text-sm text-text-mid">What one point is worth at checkout</p>
            </div>
          </div>
          <input
            type="number"
            value={pointValueInr}
            onChange={(e) => setPointValueInr(e.target.value)}
            className="w-24 px-3 py-1.5 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark font-medium self-start sm:self-auto"
            min="0.01"
            step="0.01"
          />
        </div>

        {/* Redemption limit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary">
              <Percent size={18} />
            </div>
            <div>
              <p className="font-medium text-text-dark">Redemption Limit (% of order)</p>
              <p className="text-sm text-text-mid">
                Most an order can be paid with points. Enforced server-side and stated in the
                Terms; deliberately not shown on the cart or checkout.
              </p>
            </div>
          </div>
          <input
            type="number"
            value={redeemCapPercent}
            onChange={(e) => setRedeemCapPercent(e.target.value)}
            className="w-24 px-3 py-1.5 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark font-medium self-start sm:self-auto"
            min="0"
            max="100"
            step="1"
          />
        </div>

        {/* Weekly season prize */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary">
              <Trophy size={18} />
            </div>
            <div>
              <p className="font-medium text-text-dark">Weekly Top Reward (₹)</p>
              <p className="text-sm text-text-mid">
                What 1st place wins when a territory season closes. Places 2–{PAID_PLACES} are
                calculated from it automatically by rank and area held.
              </p>
            </div>
          </div>
          <input
            type="number"
            value={seasonTopRewardInr}
            onChange={(e) => setSeasonTopRewardInr(e.target.value)}
            className="w-24 px-3 py-1.5 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark font-medium self-start sm:self-auto"
            min="0"
            step="10"
          />
        </div>

        {/* Prize table preview */}
        {rows.length > 0 && (
          <div className="rounded-lg bg-bg border border-border p-4">
            <p className="text-xs font-semibold text-text-mid uppercase tracking-wider mb-2">
              Prize table
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-dark">
              {shown.map((i) => (
                <span key={rows[i].rank}>
                  <span className="text-text-mid">#{rows[i].rank}</span>{' '}
                  <strong>₹{rows[i].inr.toFixed(2)}</strong>
                </span>
              ))}
            </div>
            <p className="text-sm text-text-mid mt-2">
              A full table of {PAID_PLACES} costs at most{' '}
              <strong className="text-text-dark">₹{total.toFixed(2)}</strong> per week
              {Number(pointValueInr) > 0 && (
                <> ({Math.round(total / Number(pointValueInr)).toLocaleString()} points)</>
              )}
              . Fewer players means fewer prizes paid.
            </p>
          </div>
        )}

        {/* Liability */}
        {outstandingPoints !== null && (
          <div className="rounded-lg bg-bg border border-border p-4">
            <p className="text-xs font-semibold text-text-mid uppercase tracking-wider mb-1">
              Outstanding liability
            </p>
            <p className="text-sm text-text-dark">
              <strong>{outstandingPoints.toLocaleString()}</strong> points are held by customers —
              worth <strong>₹{(outstandingPoints * (Number(pointValueInr) || 0)).toFixed(2)}</strong>
              {Number(pointValueInr) !== savedPointValue && (
                <> at the new rate, versus <strong>₹{(outstandingPoints * savedPointValue).toFixed(2)}</strong> today</>
              )}
              .
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          {isSaving ? 'Saving…' : 'Save Points Settings'}
        </button>
      </div>
    </div>
  );
};

export default PointsSettings;
