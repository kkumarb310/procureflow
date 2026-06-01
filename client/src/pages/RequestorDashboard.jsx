import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Minus, Trash2, Send, Clock, Loader2, PackageOpen, CheckCircle2, Search } from 'lucide-react';
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
const newCustomRow = () => ({ key: crypto.randomUUID(), name: '', quantity: 1 });

// Small quantity stepper (− [n] +) reused for catalog rows and custom rows.
function QtyInput({ value, onChange, onBump, min = 0 }) {
  const dec = () => (onBump ? onBump(-1) : onChange(Math.max(min, value - 1)));
  const inc = () => (onBump ? onBump(1) : onChange(value + 1));
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" onClick={dec} className="grid place-items-center w-7 h-8 rounded-lg bg-bg border border-border text-muted hover:text-text transition">
        <Minus size={13} />
      </button>
      <input
        className="input w-14 text-center !px-1"
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value, 10) || 0))}
      />
      <button type="button" onClick={inc} className="grid place-items-center w-7 h-8 rounded-lg bg-bg border border-border text-muted hover:text-text transition">
        <Plus size={13} />
      </button>
    </div>
  );
}

function NewRequest({ user, onDone }) {
  const [department, setDepartment] = useState(user?.department || 'IT');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Admin-managed catalog, pre-listed with quantity 0.
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [qty, setQty] = useState({});            // { [catalogItemId]: number }
  const [customRows, setCustomRows] = useState([]); // requestor-added items, shown on top
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let active = true;
    api.items()
      .then(({ items }) => { if (active) setCatalog(items); })
      .catch((e) => toast.error(e.message))
      .finally(() => active && setLoadingCatalog(false));
    return () => { active = false; };
  }, []);

  const setItemQty = (id, val) => setQty((q) => ({ ...q, [id]: Math.max(0, val) }));
  const bump = (id, delta) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + delta) }));

  const addCustomRow = () => setCustomRows((r) => [newCustomRow(), ...r]);
  const updateCustomRow = (key, patch) => setCustomRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const removeCustomRow = (key) => setCustomRows((r) => r.filter((x) => x.key !== key));

  // catalog filtered by the search box (flat list — no category grouping)
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? catalog.filter((it) => it.name.toLowerCase().includes(f)) : catalog;
  }, [catalog, filter]);

  // items to submit: catalog rows with qty > 0, plus named custom rows with qty > 0
  const selectedCatalog = catalog
    .filter((it) => (qty[it.id] || 0) > 0)
    .map((it) => ({ name: it.name, quantity: qty[it.id] }));
  const selectedCustom = customRows
    .filter((r) => r.name.trim() && r.quantity > 0)
    .map((r) => ({ name: r.name.trim(), quantity: r.quantity }));
  const allItems = [...selectedCustom, ...selectedCatalog];
  const total = allItems.length;

  const submit = async () => {
    if (total === 0) return toast.error('Set a quantity for at least one item');
    setBusy(true);
    try {
      const { request } = await api.createRequest({ department, notes, items: allItems });
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
          Set a quantity for the items you need — leave the rest at <strong className="text-text">0</strong>. Need something not listed? Add it at the top.
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

        {/* Custom items added by the requestor (shown on top of the catalog) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="label !mb-0">Custom items</span>
            <button onClick={addCustomRow} className="text-xs text-brand font-semibold flex items-center gap-1 hover:underline">
              <Plus size={13} /> Add item
            </button>
          </div>
          {customRows.length === 0 ? (
            <p className="text-xs text-muted">Not in the catalog below? Click “Add item” to enter your own.</p>
          ) : (
            <div className="space-y-2">
              {customRows.map((row) => (
                <motion.div key={row.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="input flex-1"
                    placeholder="Custom item name…"
                    value={row.name}
                    onChange={(e) => updateCustomRow(row.key, { name: e.target.value })}
                  />
                  <QtyInput value={row.quantity} min={1} onChange={(v) => updateCustomRow(row.key, { quantity: Math.max(1, v) })} />
                  <button
                    onClick={() => removeCustomRow(row.key)}
                    className="grid place-items-center w-9 h-9 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition shrink-0"
                    aria-label="Remove"
                  >
                    <Trash2 size={15} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Pre-populated catalog — quantities default to 0 */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="label !mb-0">Catalog{catalog.length ? ` (${catalog.length} items)` : ''}</span>
            <div className="relative w-44">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input !py-1.5 pl-8 text-xs" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
          </div>

          {loadingCatalog ? (
            <p className="text-sm text-muted py-8 text-center">Loading catalog…</p>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden max-h-[440px] overflow-y-auto divide-y divide-border">
              {filtered.length === 0 && (
                <p className="text-sm text-muted py-8 text-center">No items match “{filter}”.</p>
              )}
              {filtered.map((it) => {
                const v = qty[it.id] || 0;
                return (
                  <div key={it.id} className={`flex items-center gap-3 px-4 py-2.5 transition ${v > 0 ? 'bg-brand/5' : ''}`}>
                    <span className={`flex-1 text-sm ${v > 0 ? 'text-text font-medium' : 'text-muted'}`}>{it.name}</span>
                    <QtyInput value={v} min={0} onChange={(nv) => setItemQty(it.id, nv)} onBump={(d) => bump(it.id, d)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="label">Notes / Justification</label>
          <textarea className="input min-h-[80px] resize-y" placeholder="Optional context for the approver…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button onClick={submit} disabled={busy || total === 0} className="btn-primary w-full">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Submit request ({total} item{total === 1 ? '' : 's'})</>}
        </button>
      </div>
    </div>
  );
}
