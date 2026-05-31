import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Trash2, Send, Clock, Loader2, PackageOpen, CheckCircle2, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Shell from '../components/Shell';
import { StatusPill, StatCard, EmptyState, SkeletonRows } from '../components/ui';

const DEPARTMENTS = ['IT', 'Finance', 'HR', 'Operations', 'Marketing', 'Legal'];

export default function RequestorDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState('my');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { requests } = await api.listRequests();
      setRequests(requests);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests]);

  const nav = [
    { key: 'my', label: 'My Requests', icon: ClipboardList },
    { key: 'new', label: 'New Request', icon: Plus },
  ];

  return (
    <Shell nav={nav} active={view} onSelect={setView}>
      {view === 'my' ? (
        <MyRequests requests={requests} loading={loading} counts={counts} onNew={() => setView('new')} />
      ) : (
        <NewRequest user={user} onDone={() => { load(); setView('my'); }} />
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------
function MyRequests({ requests, loading, counts, onNew }) {
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">My Requisitions</h1>
          <p className="text-muted text-sm mt-1">Track the status of your purchase requests.</p>
        </div>
        <button onClick={onNew} className="btn-primary"><Plus size={16} /> New Request</button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={counts.total} accent="text-brand" icon={ClipboardList} delay={0} />
        <StatCard label="Pending" value={counts.pending} accent="text-warn" icon={Clock} delay={0.05} />
        <StatCard label="Approved" value={counts.approved} accent="text-ok" icon={CheckCircle2} delay={0.1} />
        <StatCard label="Rejected" value={counts.rejected} accent="text-danger" icon={Trash2} delay={0.15} />
      </div>

      {loading ? (
        <SkeletonRows rows={4} />
      ) : requests.length === 0 ? (
        <EmptyState icon={PackageOpen} title="No requests yet" subtitle="Create your first purchase request to get started." />
      ) : (
        <div className="space-y-4">
          {requests.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="card p-5"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-brand">{req.code}</span>
                  <span className="text-xs text-muted bg-bg px-2 py-0.5 rounded-full">{req.department}</span>
                </div>
                <StatusPill status={req.status} />
              </div>
              <div className="text-xs text-muted mt-2 flex items-center gap-1.5">
                <Clock size={13} /> {format(new Date(req.created_at), 'dd MMM yyyy, HH:mm')} · {req.items.length} items
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {req.items.map((it) => (
                  <span key={it.id} className="text-xs bg-bg border border-border px-2.5 py-1 rounded-full">
                    {it.name} <strong className="text-brand">×{it.quantity}</strong>
                  </span>
                ))}
              </div>
              {req.admin_notes && (
                <div className="text-xs mt-3 px-3 py-2 rounded-lg bg-danger/5 text-danger/90 border border-danger/15">
                  💬 Admin: {req.admin_notes}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
const OTHER = '__other__';
const newRow = () => ({ key: crypto.randomUUID(), value: '', custom: '', quantity: 1 });

// effective item name for a row (handles the "Other" custom case)
const rowName = (r) => (r.value === OTHER ? r.custom.trim() : r.value.trim());

function NewRequest({ user, onDone }) {
  const [rows, setRows] = useState([newRow()]);
  const [department, setDepartment] = useState(user?.department || 'IT');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Admin-managed catalog used to populate the dropdown.
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  useEffect(() => {
    let active = true;
    api.items()
      .then(({ items }) => active && setCatalog(items))
      .catch((e) => toast.error(e.message))
      .finally(() => active && setLoadingCatalog(false));
    return () => { active = false; };
  }, []);

  // group catalog items by category for <optgroup>
  const grouped = useMemo(() => {
    const g = {};
    for (const it of catalog) (g[it.category] ||= []).push(it);
    return g;
  }, [catalog]);

  const addRow = () => setRows((r) => [...r, newRow()]);
  const removeRow = (key) => setRows((r) => (r.length === 1 ? r : r.filter((x) => x.key !== key)));
  const updateRow = (key, patch) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const valid = rows.filter((r) => rowName(r));

  const submit = async () => {
    if (valid.length === 0) return toast.error('Add at least one item');
    setBusy(true);
    try {
      const { request } = await api.createRequest({
        department,
        notes,
        items: valid.map((r) => ({ name: rowName(r), quantity: r.quantity })),
      });
      toast.success(`Request ${request.code} submitted!`);
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold">New Purchase Request</h1>
        <p className="text-muted text-sm mt-1">
          Pick items from the catalog dropdown (or choose <strong className="text-text">Other</strong> to add your own), set quantities, and submit.
        </p>
      </header>

      <div className="card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Department</label>
            <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="label !mb-0">Items ({valid.length})</span>
            <button onClick={addRow} className="text-xs text-brand font-semibold flex items-center gap-1 hover:underline">
              <Plus size={13} /> Add row
            </button>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <motion.div
                key={row.key}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="w-6 text-center text-xs text-muted font-mono">{i + 1}</span>

                {row.value === OTHER ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      autoFocus
                      className="input flex-1"
                      placeholder="Type a custom item name…"
                      value={row.custom}
                      onChange={(e) => updateRow(row.key, { custom: e.target.value })}
                    />
                    <button
                      onClick={() => updateRow(row.key, { value: '', custom: '' })}
                      className="grid place-items-center w-9 h-9 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition shrink-0"
                      title="Back to catalog list"
                    >
                      <List size={15} />
                    </button>
                  </div>
                ) : (
                  <select
                    className="input flex-1"
                    value={row.value}
                    disabled={loadingCatalog}
                    onChange={(e) => updateRow(row.key, { value: e.target.value })}
                  >
                    <option value="">{loadingCatalog ? 'Loading catalog…' : 'Select an item…'}</option>
                    {Object.entries(grouped).map(([cat, items]) => (
                      <optgroup key={cat} label={cat}>
                        {items.map((it) => <option key={it.id} value={it.name}>{it.name}</option>)}
                      </optgroup>
                    ))}
                    <option value={OTHER}>➕ Other (add a custom item)…</option>
                  </select>
                )}

                <input
                  className="input w-20 text-center"
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                />
                <button
                  onClick={() => removeRow(row.key)}
                  className="grid place-items-center w-9 h-9 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition shrink-0"
                  aria-label="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Notes / Justification</label>
          <textarea className="input min-h-[80px] resize-y" placeholder="Optional context for the approver…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button onClick={submit} disabled={busy || valid.length === 0} className="btn-primary w-full">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Submit request ({valid.length} items)</>}
        </button>
      </div>
    </div>
  );
}
