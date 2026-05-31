import { motion } from 'framer-motion';

// --- Status pill -----------------------------------------------------------
const STATUS = {
  pending: { label: 'Pending', cls: 'text-warn bg-warn/10 ring-1 ring-warn/20' },
  approved: { label: 'Approved', cls: 'text-ok bg-ok/10 ring-1 ring-ok/20' },
  rejected: { label: 'Rejected', cls: 'text-danger bg-danger/10 ring-1 ring-danger/20' },
};

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return <span className={`pill ${s.cls}`}>{s.label}</span>;
}

// --- Stat card -------------------------------------------------------------
export function StatCard({ label, value, accent = 'text-brand', icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="card p-5 flex items-center gap-4 hover:border-brand/40 transition-colors"
    >
      {Icon && (
        <div className={`grid place-items-center w-11 h-11 rounded-xl bg-bg ${accent}`}>
          <Icon size={20} />
        </div>
      )}
      <div>
        <div className={`text-2xl font-extrabold leading-none ${accent}`}>{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted mt-1.5">{label}</div>
      </div>
    </motion.div>
  );
}

// --- Empty state -----------------------------------------------------------
export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="card p-14 text-center">
      {Icon && <Icon className="mx-auto mb-3 text-muted/50" size={36} />}
      <div className="text-text font-semibold">{title}</div>
      {subtitle && <div className="text-muted text-sm mt-1">{subtitle}</div>}
    </div>
  );
}

// --- Loading skeleton rows -------------------------------------------------
export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="card divide-y divide-border overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="skeleton h-4 w-24 rounded bg-surface-2" />
          <div className="skeleton h-4 flex-1 rounded bg-surface-2" />
          <div className="skeleton h-4 w-20 rounded bg-surface-2" />
          <div className="skeleton h-6 w-16 rounded-full bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

// --- Segmented control -----------------------------------------------------
export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex gap-1 p-1 bg-bg rounded-xl border border-border">
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = v === value;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
              active ? 'text-white' : 'text-muted hover:text-text'
            }`}
          >
            {active && (
              <motion.span
                layoutId="seg-active"
                className="absolute inset-0 bg-brand rounded-lg -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
