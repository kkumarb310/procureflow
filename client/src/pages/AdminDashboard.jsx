import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Inbox, FolderOpen, BarChart3, Tags, Clock, CheckCircle2, XCircle, Layers, Loader2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { api } from '../api/client';
import Shell from '../components/Shell';
import Modal from '../components/Modal';
import Reports from '../components/Reports';
import CatalogManager from '../components/CatalogManager';
import { StatusPill, StatCard, EmptyState, SkeletonRows, Segmented } from '../components/ui';

export default function AdminDashboard() {
  const [view, setView] = useState('inbox');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(null); // request open in modal

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

  // lazy-load report data when first visiting reports
  useEffect(() => {
    if (view === 'report' && !report) {
      api.reportSummary().then(setReport).catch((e) => toast.error(e.message));
    }
  }, [view, report]);

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests]);

  const pending = requests.filter((r) => r.status === 'pending');
  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const nav = [
    { key: 'inbox', label: 'Inbox', icon: Inbox, badge: counts.pending },
    { key: 'all', label: 'All Requests', icon: FolderOpen },
    { key: 'catalog', label: 'Item Catalog', icon: Tags },
    { key: 'report', label: 'Reports', icon: BarChart3 },
  ];

  const review = async (status, adminNotes) => {
    try {
      const { request } = await api.setStatus(active.id, status, adminNotes);
      setRequests((rs) => rs.map((r) => (r.id === request.id ? request : r)));
      setReport(null); // invalidate report cache
      setActive(null);
      toast.success(`Request ${status}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Shell nav={nav} active={view} onSelect={setView}>
      {view === 'catalog' ? (
        <CatalogManager />
      ) : view === 'report' ? (
        report ? <Reports data={report} /> : <SkeletonRows rows={3} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total" value={counts.total} accent="text-brand" icon={Layers} delay={0} />
            <StatCard label="Pending" value={counts.pending} accent="text-warn" icon={Clock} delay={0.05} />
            <StatCard label="Approved" value={counts.approved} accent="text-ok" icon={CheckCircle2} delay={0.1} />
            <StatCard label="Rejected" value={counts.rejected} accent="text-danger" icon={XCircle} delay={0.15} />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              {view === 'inbox' ? 'Pending Inbox' : 'All Requests'}
            </h1>
            {view === 'all' && (
              <Segmented options={['all', 'pending', 'approved', 'rejected']} value={filter} onChange={setFilter} />
            )}
          </div>

          {loading ? (
            <SkeletonRows rows={6} />
          ) : (
            <RequestTable
              rows={view === 'inbox' ? pending : filtered}
              onOpen={setActive}
            />
          )}
        </div>
      )}

      <ReviewModal request={active} onClose={() => setActive(null)} onReview={review} />
    </Shell>
  );
}

// ---------------------------------------------------------------------------
function RequestTable({ rows, onOpen }) {
  if (rows.length === 0) {
    return <EmptyState icon={Inbox} title="Nothing here" subtitle="No requests match this view." />;
  }
  return (
    <div className="card overflow-hidden">
      {/* header (desktop) */}
      <div className="hidden md:grid grid-cols-[120px_1fr_110px_70px_170px_110px] gap-3 px-5 py-3 bg-bg text-[11px] uppercase tracking-wider font-bold text-muted border-b border-border">
        <span>ID</span><span>Requestor</span><span>Dept</span><span className="text-center">Items</span><span>Submitted</span><span>Status</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((req, i) => (
          <motion.button
            key={req.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.25) }}
            onClick={() => onOpen(req)}
            className="w-full text-left grid grid-cols-2 md:grid-cols-[120px_1fr_110px_70px_170px_110px] gap-2 md:gap-3 px-5 py-4 items-center hover:bg-surface-2 transition group"
          >
            <span className="font-mono text-sm font-semibold text-brand">{req.code}</span>
            <span className="font-medium truncate">{req.requestor_name}</span>
            <span className="text-sm text-muted hidden md:block">{req.department}</span>
            <span className="text-sm text-center hidden md:block">{req.items.length}</span>
            <span className="text-xs text-muted hidden md:block">{format(new Date(req.created_at), 'dd MMM yyyy HH:mm')}</span>
            <span className="justify-self-end md:justify-self-start"><StatusPill status={req.status} /></span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ReviewModal({ request, onClose, onReview }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setNotes(''); }, [request]);
  if (!request) return null;

  const act = async (status) => {
    setBusy(true);
    await onReview(status, notes);
    setBusy(false);
  };

  return (
    <Modal open={!!request} onClose={onClose}>
      <div className="flex items-start justify-between gap-4 pr-6">
        <div>
          <div className="font-mono text-xl font-extrabold text-brand">{request.code}</div>
          <div className="text-sm text-muted mt-1">
            {request.requestor_name} · {request.department} · {format(new Date(request.created_at), 'dd MMM yyyy, HH:mm')}
          </div>
        </div>
        <StatusPill status={request.status} />
      </div>

      <div className="mt-6">
        <div className="label">Items ({request.items.length})</div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {request.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between px-3.5 py-2.5 bg-bg rounded-lg">
              <span className="text-sm">{it.name}</span>
              <span className="font-mono font-bold text-brand text-sm">×{it.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {request.notes && (
        <div className="mt-4 px-3.5 py-3 bg-bg border border-border rounded-lg text-sm text-muted">
          <strong className="text-text">Requestor notes:</strong> {request.notes}
        </div>
      )}

      {request.status === 'pending' ? (
        <div className="mt-5 space-y-3">
          <div>
            <label className="label">Admin notes (optional)</label>
            <textarea className="input min-h-[70px] resize-none" placeholder="Reason for approval or rejection…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => act('approved')} disabled={busy} className="btn flex-1 bg-ok text-white hover:opacity-90">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Approve</>}
            </button>
            <button onClick={() => act('rejected')} disabled={busy} className="btn flex-1 bg-danger text-white hover:opacity-90">
              <X size={16} /> Reject
            </button>
          </div>
        </div>
      ) : (
        request.admin_notes && (
          <div className="mt-4 px-3.5 py-3 rounded-lg bg-surface-2 text-sm">
            <strong className="text-text">Decision notes:</strong> <span className="text-muted">{request.admin_notes}</span>
          </div>
        )
      )}
    </Modal>
  );
}
