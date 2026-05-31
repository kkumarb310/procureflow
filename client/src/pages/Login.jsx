import { useState } from 'react';
import { motion } from 'framer-motion';
import { Hexagon, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  { email: 'sarah@procureflow.dev', label: 'Sarah · Admin' },
  { email: 'alice@procureflow.dev', label: 'Alice · Requestor' },
];

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'requestor', department: 'IT' });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register(form);
        toast.success('Account created!');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const quickFill = (email) => setForm((f) => ({ ...f, email, password: 'password123' }));

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden border-r border-border">
        {/* Naani's storefront hero image + readability overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: "url('/naani.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-bg via-bg/85 to-bg/40" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-brand/15 text-brand">
            <Hexagon size={20} className="fill-brand/30" />
          </div>
          <span className="text-xl font-extrabold">Naani's ProcureFlow</span>
        </div>
        <div className="relative">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold leading-tight"
          >
            Purchase requisitions,
            <br />
            <span className="text-brand">beautifully simple.</span>
          </motion.h1>
          <p className="text-muted mt-4 max-w-md">
            Submit, track and approve purchase requests with real-time dashboards and analytics. Built on an
            open-source stack — Node, Postgres & React.
          </p>
        </div>
        <div className="relative text-xs text-muted">© {new Date().getFullYear()} Naani's ProcureFlow · Open source demo</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Hexagon size={22} className="text-brand fill-brand/30" />
            <span className="text-xl font-extrabold">Naani's ProcureFlow</span>
          </div>

          <h2 className="text-2xl font-bold">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <p className="text-muted text-sm mt-1 mb-6">
            {mode === 'login' ? 'Enter your credentials to continue.' : 'Set up a new requestor or admin account.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
            </div>

            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role} onChange={set('role')}>
                    <option value="requestor">Requestor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <input className="input" value={form.department} onChange={set('department')} placeholder="IT" />
                </div>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></>}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Quick demo login</div>
              <div className="flex gap-2">
                {DEMO.map((d) => (
                  <button key={d.email} onClick={() => quickFill(d.email)} className="btn-ghost flex-1 !py-2 text-xs">
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-2">Password for all demo users: <span className="font-mono text-text">password123</span></p>
            </div>
          )}

          <div className="text-sm text-muted mt-6 text-center">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-brand font-semibold hover:underline"
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
