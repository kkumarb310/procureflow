import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/items?search=pen — catalog list / autocomplete (any authed user)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    const sql = search
      ? `SELECT id, name, category FROM catalog_items WHERE name ILIKE $1 ORDER BY category, name LIMIT 50`
      : `SELECT id, name, category FROM catalog_items ORDER BY category, name`;
    const params = search ? [`%${search}%`] : [];
    const { rows } = await query(sql, params);
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/items — add a catalog item (admin only)
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const category = String(req.body?.category || 'General').trim() || 'General';
    if (!name) return res.status(400).json({ error: 'Item name is required' });

    const { rows } = await query(
      `INSERT INTO catalog_items (name, category) VALUES ($1, $2)
       RETURNING id, name, category`,
      [name, category]
    );
    res.status(201).json({ item: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That item already exists' });
    next(err);
  }
});

// DELETE /api/items/:id — remove a catalog item (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM catalog_items WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
