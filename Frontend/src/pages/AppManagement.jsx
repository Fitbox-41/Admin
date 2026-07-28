import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Smartphone, Users as UsersIcon, Trophy, Bell, Map, Activity, Footprints,
  Coins, Loader2, Plus, Pencil, Trash2, Send, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const TABS = [
  { key: 'overview', label: 'Overview', icon: <Activity size={16} /> },
  { key: 'users', label: 'Users', icon: <UsersIcon size={16} /> },
  { key: 'challenges', label: 'Challenges', icon: <Trophy size={16} /> },
  { key: 'push', label: 'Push', icon: <Bell size={16} /> },
  { key: 'territory', label: 'Territory', icon: <Map size={16} /> },
];

const AppManagement = () => {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary-light/10 rounded-xl text-primary">
          <Smartphone size={22} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">App Management</h1>
          <p className="text-sm text-text-mid">Analytics & controls for the FitBox mobile app</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-mid hover:text-text-dark'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'users' && <AppUsers />}
      {tab === 'challenges' && <Challenges />}
      {tab === 'push' && <Push />}
      {tab === 'territory' && <Territory />}
    </div>
  );
};

// ---------------------------------------------------------------- Overview --
const StatCard = ({ icon, label, value, sub }) => (
  <div className="glass p-5 rounded-xl">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-text-mid font-medium">{label}</p>
        <h3 className="text-2xl font-bold mt-1.5">{value}</h3>
        {sub && <p className="text-xs text-text-light mt-1">{sub}</p>}
      </div>
      <div className="p-2.5 bg-primary-light/10 rounded-lg text-primary">{icon}</div>
    </div>
  </div>
);

const Overview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/app/analytics`);
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <ErrorNote />;

  const inr = (pts) => `₹${((pts || 0) * (data.points.valueInr || 0.1)).toLocaleString('en-IN')}`;
  const sources = Object.entries(data.points.bySource || {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={<UsersIcon size={20} />} label="App Users" value={data.users.total}
          sub={`${data.users.withPush} with push enabled`} />
        <StatCard icon={<Activity size={20} />} label="Runs Recorded" value={data.runs.count}
          sub={`${data.runs.durationHr} h active`} />
        <StatCard icon={<Footprints size={20} />} label="Distance" value={`${data.runs.distanceKm} km`}
          sub={`${(data.runs.steps || 0).toLocaleString('en-IN')} steps`} />
        <StatCard icon={<Coins size={20} />} label="Points Outstanding" value={data.points.outstanding}
          sub={`≈ ${inr(data.points.outstanding)} liability`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-xl">
          <h3 className="font-bold mb-4">Runs — last 14 days</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.runs.daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false}
                  tickFormatter={(d) => (d ? d.slice(8) : '')} tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="runs" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-6 rounded-xl">
          <h3 className="font-bold mb-4">Points economy</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="p-4 rounded-lg bg-green-500/10">
              <p className="text-xs text-text-mid">Earned (all time)</p>
              <p className="text-xl font-bold text-green-600">{data.points.earned}</p>
              <p className="text-xs text-text-light">{inr(data.points.earned)}</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10">
              <p className="text-xs text-text-mid">Redeemed</p>
              <p className="text-xl font-bold text-primary">{data.points.redeemed}</p>
              <p className="text-xs text-text-light">{inr(data.points.redeemed)}</p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-wider text-text-light mb-2">By source</p>
          <div className="space-y-2">
            {sources.length === 0 && <p className="text-sm text-text-mid">No transactions yet.</p>}
            {sources.map(([src, total]) => (
              <div key={src} className="flex justify-between text-sm">
                <span className="text-text-mid capitalize">{src.replace(/_/g, ' ')}</span>
                <span className="font-medium">{total}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-light mt-4">1 point = ₹{data.points.valueInr} · redeemable up to 50% of an order.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard icon={<Trophy size={20} />} label="Challenges" value={data.challenges.active}
          sub={`${data.challenges.joins} joins · ${data.challenges.claims} claimed`} />
        <StatCard icon={<Map size={20} />} label="Territory Holders" value={data.territory.holders}
          sub={`Season ${data.territory.season}`} />
        <StatCard icon={<Bell size={20} />} label="Push Reach" value={data.users.withPush}
          sub={`of ${data.users.total} users`} />
      </div>
    </div>
  );
};

// ------------------------------------------------------------------- Users --
const AppUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/app/users`);
        if (res.ok) setUsers((await res.json()).users || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = users.filter(
    (u) => u.name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…"
          className="w-full max-w-md px-4 py-2 border border-border rounded-lg bg-bg outline-none focus:border-primary text-sm" />
      </div>
      <div className="overflow-x-auto">
        {loading ? <Spinner /> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg text-text-mid text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Points</th>
                <th className="px-5 py-3 font-medium">Runs</th>
                <th className="px-5 py-3 font-medium">Distance</th>
                <th className="px-5 py-3 font-medium">Territory</th>
                <th className="px-5 py-3 font-medium">Push</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u._id} className="hover:bg-bg/50 text-sm">
                  <td className="px-5 py-3">
                    <div className="font-medium text-text-dark">{u.name}</div>
                    <div className="text-xs text-text-light">{u.email}</div>
                  </td>
                  <td className="px-5 py-3 font-medium">{u.points}</td>
                  <td className="px-5 py-3 text-text-mid">{u.runs}</td>
                  <td className="px-5 py-3 text-text-mid">{u.distanceKm} km</td>
                  <td className="px-5 py-3 text-text-mid">{u.territoryArea ? `${u.territoryArea} m²` : '—'}</td>
                  <td className="px-5 py-3">
                    {u.pushRegistered
                      ? <CheckCircle2 size={16} className="text-green-500" />
                      : <XCircle size={16} className="text-text-light" />}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-text-mid">No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------- Challenges --
const EMPTY = {
  title: '', description: '', goalType: 'steps', goalTarget: 10000,
  durationDays: 2, rewardPoints: 100, userCap: 0, active: true,
};

const Challenges = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed; object = create/edit
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/app/challenges`);
      if (res.ok) setList((await res.json()).challenges || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const editing = !!form._id;
      const url = editing ? `${API_URL}/app/challenges/${form._id}` : `${API_URL}/app/challenges`;
      const body = {
        title: form.title,
        description: form.description,
        goalType: form.goalType,
        goalTarget: Number(form.goalTarget),
        durationDays: Number(form.durationDays),
        rewardPoints: Number(form.rewardPoints),
        userCap: Number(form.userCap),
        active: !!form.active,
      };
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || 'Save failed');
      setForm(null);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this challenge? Participant progress will be removed too.')) return;
    try {
      await fetch(`${API_URL}/app/challenges/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-mid">Challenges appear in the app for users to join and earn points.</p>
        <button onClick={() => { setErr(''); setForm({ ...EMPTY }); }}
          className="flex items-center gap-2 bg-primary text-white py-2 px-4 rounded-lg text-sm hover:bg-primary-dark">
          <Plus size={16} /> New Challenge
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((c) => (
            <div key={c._id} className="glass rounded-xl p-5">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-text-dark">{c.title}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.active ? 'bg-green-500/15 text-green-600' : 'bg-text-light/15 text-text-mid'}`}>
                      {c.active ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </div>
                  {c.description && <p className="text-sm text-text-mid mt-1">{c.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setErr(''); setForm({ ...c }); }} className="p-2 rounded-lg hover:bg-bg text-text-mid"><Pencil size={15} /></button>
                  <button onClick={() => remove(c._id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-text-mid">
                <span>🎯 {c.goalType === 'distance' ? `${c.goalTarget} km` : `${c.goalTarget.toLocaleString('en-IN')} steps`}</span>
                <span>⏱ {c.durationDays}d</span>
                <span>🏆 +{c.rewardPoints} pts</span>
                <span>👥 {c.userCap > 0 ? `first ${c.userCap}` : 'unlimited'}</span>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-text-mid text-sm col-span-2">No challenges yet — create the first one.</p>}
        </div>
      )}

      {form && (
        <Modal onClose={() => setForm(null)} title={form._id ? 'Edit Challenge' : 'New Challenge'}>
          <div className="space-y-3">
            <Field label="Title"><input className={inputCls} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Description"><textarea rows={2} className={inputCls} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Goal type">
                <select className={inputCls} value={form.goalType}
                  onChange={(e) => setForm({ ...form, goalType: e.target.value })}>
                  <option value="steps">Steps</option>
                  <option value="distance">Distance (km)</option>
                </select>
              </Field>
              <Field label={form.goalType === 'distance' ? 'Target (km)' : 'Target (steps)'}>
                <input type="number" className={inputCls} value={form.goalTarget}
                  onChange={(e) => setForm({ ...form, goalTarget: e.target.value })} />
              </Field>
              <Field label="Duration (days)"><input type="number" className={inputCls} value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: e.target.value })} /></Field>
              <Field label="Reward points"><input type="number" className={inputCls} value={form.rewardPoints}
                onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} /></Field>
              <Field label="User cap (0 = unlimited)"><input type="number" className={inputCls} value={form.userCap}
                onChange={(e) => setForm({ ...form, userCap: e.target.value })} /></Field>
              <Field label="Visible in app">
                <select className={inputCls} value={form.active ? '1' : '0'}
                  onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}>
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </Field>
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={save} disabled={saving || !form.title}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// -------------------------------------------------------------------- Push --
const Push = () => {
  const [status, setStatus] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');
  const [userId, setUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/app/push/status`);
        if (res.ok) setStatus(await res.json());
      } catch (e) { console.error(e); }
    })();
  }, []);

  const send = async () => {
    setSending(true);
    setResult(null);
    try {
      const payload = { title, body };
      if (target === 'all') payload.all = true;
      else payload.userId = userId.trim();
      const res = await fetch(`${API_URL}/app/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || 'Send failed');
      setResult({ ok: true, msg: `Sent to ${data.sent} device(s) across ${data.recipients} user(s).` });
      setTitle(''); setBody('');
    } catch (e) {
      setResult({ ok: false, msg: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <div className={`glass rounded-xl p-4 flex items-center gap-3 ${status?.configured ? '' : 'border-amber-400/50'}`}>
        {status?.configured
          ? <><CheckCircle2 className="text-green-500" size={20} /><span className="text-sm">Push is configured and live.</span></>
          : <><XCircle className="text-amber-500" size={20} /><span className="text-sm">Push not configured — set <code className="text-xs bg-bg px-1 rounded">FIREBASE_SERVICE_ACCOUNT</code> on the app backend.</span></>}
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-bold">Compose notification</h3>
        <Field label="Title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New challenge dropped!" /></Field>
        <Field label="Message"><textarea rows={3} className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Complete 10k steps in 2 days to earn 100 points." /></Field>
        <Field label="Audience">
          <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="all">All users</option>
            <option value="user">Single user (by ID)</option>
          </select>
        </Field>
        {target === 'user' && (
          <Field label="User ID"><input className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Mongo _id" /></Field>
        )}
        {result && (
          <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-500'}`}>{result.msg}</p>
        )}
        <button onClick={send} disabled={sending || !title || !body || (target === 'user' && !userId) || !status?.configured}
          className="flex items-center gap-2 bg-primary text-white py-2.5 px-5 rounded-lg text-sm hover:bg-primary-dark disabled:opacity-50">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send notification
        </button>
      </div>
    </div>
  );
};

// --------------------------------------------------------------- Territory --
const Territory = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now()); // captured once, keeps render pure

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/app/analytics`);
      if (res.ok) setData((await res.json()).territory);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!data) return <ErrorNote />;

  const ends = data.seasonEndsAt ? new Date(data.seasonEndsAt) : null;
  const daysLeft = ends ? Math.max(0, Math.ceil((ends - now) / 86400000)) : null;

  return (
    <div className="space-y-5">
      <div className="glass rounded-xl p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-light">Current season</p>
          <p className="text-2xl font-bold">{data.season}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-text-light">Auto-resets</p>
          <p className="text-lg font-medium">{ends ? ends.toDateString() : '—'}{daysLeft != null && <span className="text-text-mid text-sm"> · in {daysLeft}d</span>}</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-bg text-text-mid"><RefreshCw size={18} /></button>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border font-bold text-sm">Season leaderboard — {data.holders} holders</div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg text-text-mid text-xs uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">Runner</th>
              <th className="px-5 py-3 font-medium">Territory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.leaders.map((l, i) => (
              <tr key={i} className="text-sm hover:bg-bg/50">
                <td className="px-5 py-3 font-bold text-text-mid">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-text-dark">{l.userName}</td>
                <td className="px-5 py-3 text-text-mid">{l.area.toLocaleString('en-IN')} m²</td>
              </tr>
            ))}
            {data.leaders.length === 0 && <tr><td colSpan="3" className="px-5 py-8 text-center text-text-mid">No territory captured this season yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-light">Territory resets automatically every Monday 00:00 UTC — no manual action needed.</p>
    </div>
  );
};

// ------------------------------------------------------------------ shared --
const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-bg outline-none focus:border-primary text-sm';
const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-xs font-medium text-text-mid mb-1 block">{label}</span>
    {children}
  </label>
);
const Spinner = () => (
  <div className="flex justify-center items-center py-16 text-text-mid"><Loader2 className="animate-spin w-8 h-8" /></div>
);
const ErrorNote = () => (
  <div className="glass rounded-xl p-8 text-center text-text-mid">Couldn't load app data. Check the backend connection.</div>
);
const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-card-bg rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <h3 className="font-bold text-lg mb-4">{title}</h3>
      {children}
    </div>
  </div>
);

export default AppManagement;
