import { Router } from 'express';
import { pool, query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const SELECT_WITH_ITEMS = `
  SELECT r.id, r.code, r.requestor_id, r.requestor_name, r.department,
         r.status, r.notes, r.admin_notes, r.created_at, r.updated_at,
         COALESCE(
           json_agg(json_build_object('id', ri.id, 'name', ri.name, 'quantity', ri.quantity)
                    ORDER BY ri.id) FILTER (WHERE ri.id IS NOT NULL),
           '[]'
         ) AS items
  FROM requests r
  LEFT JOIN request_items ri ON ri.request_id = r.id
`;

// GET /api/requests — requestors see their own; admins see all (optional ?status= filter)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = [];
    const params = [];

    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      where.push(`r.requestor_id = $${params.length}`);
    }
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      params.push(status);
      where.push(`r.status = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `${SELECT_WITH_ITEMS} ${whereSql} GROUP BY r.id ORDER BY r.created_at DESC`;
    const { rows } = await query(sql, params);
    res.json({ requests: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/requests — create a requisition
router.post('/', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { items, notes = '', department } = req.body || {};
    const clean = Array.isArray(items)
      ? items
          .map((it) => ({ name: String(it.name || '').trim(), quantity: Math.max(1, parseInt(it.quantity, 10) || 1) }))
          .filter((it) => it.name)
          .slice(0, 40)
      : [];

    if (clean.length === 0) return res.status(400).json({ error: 'At least one item is required' });

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO requests (code, requestor_id, requestor_name, department, notes)
       VALUES ('REQ-' || nextval('request_code_seq'), $1, $2, $3, $4)
       RETURNING id`,
      [req.user.id, req.user.name, department || req.user.department || 'General', notes]
    );
    const requestId = rows[0].id;

    for (const it of clean) {
      await client.query(
        'INSERT INTO request_items (request_id, name, quantity) VALUES ($1, $2, $3)',
        [requestId, it.name, it.quantity]
      );
    }
    await client.query('COMMIT');

    const { rows: full } = await query(`${SELECT_WITH_ITEMS} WHERE r.id = $1 GROUP BY r.id`, [requestId]);
    res.status(201).json({ request: full[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PATCH /api/requests/:id/status — admin approve/reject
router.patch('/:id/status', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { status, adminNotes = '' } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
    }
    const { rowCount } = await query(
      `UPDATE requests
       SET status = $1, admin_notes = $2, reviewed_by = $3, updated_at = now()
       WHERE id = $4 AND status = 'pending'`,
      [status, adminNotes, req.user.id, req.params.id]
    );
    if (rowCount === 0) {
      return res.status(409).json({ error: 'Request not found or already reviewed' });
    }
    const { rows } = await query(`${SELECT_WITH_ITEMS} WHERE r.id = $1 GROUP BY r.id`, [req.params.id]);
    res.json({ request: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
