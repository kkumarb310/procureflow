import { useState } from 'react';
import { Hexagon, LogOut, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="grid place-items-center w-8 h-8 rounded-lg bg-brand/15 text-brand">
        <Hexagon size={18} className="fill-brand/30" />
      </div>
      <span className="text-lg font-extrabold tracking-tight">ProcureFlow</span>
    </div>
  );
}

function NavList({ nav, active, onSelect }) {
  return (
    <nav className="flex flex-col gap-1 flex-1">
      {nav.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition ${
              isActive ? 'text-white' : 'text-muted hover:text-text hover:bg-surface-2'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 bg-brand rounded-xl -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <Icon size={18} />
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span className={`ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-danger text-white'}`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default function Shell({ nav, active, onSelect, children }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === 'admin';
  const initials = (user?.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('');

  const SidebarInner = (
    <div className="flex flex-col h-full p-4 gap-6">
      <div className="pt-1">
        <Brand />
      </div>

      <div className="flex items-center gap-3 px-2 pb-4 border-b border-border">
        <div className={`grid place-items-center w-10 h-10 rounded-full text-white font-bold ${isAdmin ? 'bg-ok' : 'bg-brand'}`}>
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{user?.name}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted">
            {isAdmin ? 'Admin · Receiver' : `Requestor · ${user?.department}`}
          </div>
        </div>
      </div>

      <NavList nav={nav} active={active} onSelect={(k) => { onSelect(k); setMobileOpen(false); }} />

      <button onClick={logout} className="btn-ghost w-full">
        <LogOut size={16} /> Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border bg-surface/60 backdrop-blur">
        {SidebarInner}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
        <Brand />
        <button onClick={() => setMobileOpen(true)} className="text-muted hover:text-text">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="lg:hidden fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="relative w-72 max-w-[80%] bg-surface border-r border-border"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <button onClick={() => setMobileOpen(false)} className="absolute top-5 right-4 text-muted hover:text-text">
                <X size={20} />
              </button>
              {SidebarInner}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10 max-w-[1400px]">{children}</main>
    </div>
  );
}
