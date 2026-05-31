import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/reports/summary — admin analytics: totals, daily/weekly/monthly series, top items
router.get('/summary', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const [totals, daily, weekly, monthly, topItems] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int  AS pending,
          COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
        FROM requests
      `),
      query(`
        SELECT to_char(d::date, 'Dy') AS label, d::date AS day,
          COUNT(r.id) FILTER (WHERE r.status = 'pending')::int  AS pending,
          COUNT(r.id) FILTER (WHERE r.status = 'approved')::int AS approved,
          COUNT(r.id) FILTER (WHERE r.status = 'rejected')::int AS rejected,
          COUNT(r.id)::int AS total
        FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') AS d
        LEFT JOIN requests r ON r.created_at::date = d::date
        GROUP BY d ORDER BY d
      `),
      query(`
        SELECT to_char(wk, 'Mon DD') AS label,
          COUNT(r.id) FILTER (WHERE r.status = 'pending')::int  AS pending,
          COUNT(r.id) FILTER (WHERE r.status = 'approved')::int AS approved,
          COUNT(r.id) FILTER (WHERE r.status = 'rejected')::int AS rejected,
          COUNT(r.id)::int AS total
        FROM generate_series(date_trunc('week', current_date) - interval '3 weeks',
                             date_trunc('week', current_date), interval '1 week') AS wk
        LEFT JOIN requests r ON date_trunc('week', r.created_at) = wk
        GROUP BY wk ORDER BY wk
      `),
      query(`
        SELECT to_char(d::date, 'DD') AS label, COUNT(r.id)::int AS total
        FROM generate_series(current_date - interval '29 days', current_date, interval '1 day') AS d
        LEFT JOIN requests r ON r.created_at::date = d::date
        GROUP BY d ORDER BY d
      `),
      query(`
        SELECT name, SUM(quantity)::int AS qty
        FROM request_items
        GROUP BY name ORDER BY qty DESC LIMIT 8
      `),
    ]);

    res.json({
      totals: totals.rows[0],
      daily: daily.rows,
      weekly: weekly.rows,
      monthly: monthly.rows,
      topItems: topItems.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
