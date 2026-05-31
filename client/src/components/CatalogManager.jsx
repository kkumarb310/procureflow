import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Loader2, Tags, PackageOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { EmptyState, SkeletonRows } from './ui';

export default function CatalogManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await api.items();
      setItems(items);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items]);
  const grouped = useMemo(() => {
    const g = {};
    for (const it of items) (g[it.category] ||= []).push(it);
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const add = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setAdding(true);
    try {
      const { item } = await api.createItem(n, category.trim() || 'General');
      setItems((list) => [...list, item]);
      setName('');
      toast.success(`Added “${item.name}”`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (item) => {
    // optimistic
    const prev = items;
    setItems((list) => list.filter((i) => i.id !== item.id));
    try {
      await api.deleteItem(item.id);
      toast.success(`Removed “${item.name}”`);
    } catch (e) {
      setItems(prev);
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Item Catalog</h1>
        <p className="text-muted text-sm mt-1">
          Manage the dropdown list requestors choose from. They can still add their own items via “Other”.
        </p>
      </header>

      {/* Add form */}
      <form onSubmit={add} className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="label">Item name</label>
            <input className="input" placeholder="e.g. Wireless Mouse" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="sm:w-48">
            <label className="label">Category</label>
            <input
              className="input"
              placeholder="General"
              list="catalog-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="catalog-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <button type="submit" disabled={adding || !name.trim()} className="btn-primary sm:w-auto">
            {adding ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add item</>}
          </button>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <SkeletonRows rows={5} />
      ) : items.length === 0 ? (
        <EmptyState icon={PackageOpen} title="Catalog is empty" subtitle="Add your first item above." />
      ) : (
        <div className="space-y-5">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2 text-muted">
                <Tags size={14} />
                <span className="text-[11px] font-bold uppercase tracking-wider">{cat}</span>
                <span className="text-[11px]">· {list.length}</span>
              </div>
              <div className="card divide-y divide-border overflow-hidden">
                <AnimatePresence initial={false}>
                  {list.map((it) => (
                    <motion.div
                      key={it.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition group"
                    >
                      <span className="text-sm">{it.name}</span>
                      <button
                        onClick={() => remove(it)}
                        className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition opacity-0 group-hover:opacity-100"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
