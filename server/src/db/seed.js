import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

const CATALOG = [
  ['Office Paper A4 (Ream)', 'Stationery'], ['Ballpoint Pens (Box)', 'Stationery'],
  ['Printer Ink Cartridge', 'Stationery'], ['Stapler', 'Stationery'],
  ['Staple Pins (Box)', 'Stationery'], ['Sticky Notes', 'Stationery'],
  ['File Folders', 'Stationery'], ['Binder Clips', 'Stationery'],
  ['Whiteboard Markers', 'Stationery'], ['Correction Fluid', 'Stationery'],
  ['Scissors', 'Stationery'], ['Tape Dispenser', 'Stationery'],
  ['Highlighters', 'Stationery'], ['Notebooks', 'Stationery'],
  ['Envelopes', 'Stationery'], ['USB Flash Drive 32GB', 'Electronics'],
  ['HDMI Cable', 'Electronics'], ['Extension Cord', 'Electronics'],
  ['Desk Organizer', 'Furniture'], ['Mouse Pad', 'Electronics'],
  ['AA Batteries (Pack)', 'Electronics'], ['Cleaning Wipes', 'Pantry'],
  ['Hand Sanitizer', 'Pantry'], ['Coffee Pods', 'Pantry'],
  ['Tea Bags', 'Pantry'], ['Paper Cups', 'Pantry'],
  ['Tissue Box', 'Pantry'], ['Trash Bags', 'Pantry'],
  ['Disinfectant Spray', 'Pantry'], ['Laptop Stand', 'Furniture'],
  ['Keyboard Wireless', 'Electronics'], ['Monitor Cable', 'Electronics'],
  ['Power Bank', 'Electronics'], ['Headset', 'Electronics'],
  ['Webcam HD', 'Electronics'], ['Laser Pointer', 'Electronics'],
  ['Name Badge Holders', 'Stationery'], ['Presentation Folders', 'Stationery'],
  ['Rubber Bands', 'Stationery'], ['Monitor 24"', 'Electronics'],
];

const USERS = [
  { name: 'Satheesh',      email: 'alice@procureflow.dev',  role: 'requestor', department: 'IT' },
  { name: 'Bob Mendes',    email: 'bob@procureflow.dev',    role: 'requestor', department: 'Finance' },
  { name: 'Carol Singh',   email: 'carol@procureflow.dev',  role: 'requestor', department: 'HR' },
  { name: 'David Kim',     email: 'david@procureflow.dev',  role: 'requestor', department: 'Operations' },
  { name: 'Vinay',         email: 'sarah@procureflow.dev',  role: 'admin',     department: 'Procurement' },
  { name: 'Mike Receiver', email: 'mike@procureflow.dev',   role: 'admin',     department: 'Warehouse' },
];

const DEMO_PASSWORD = 'password123';

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('[seed] clearing existing data...');
    await client.query('TRUNCATE request_items, requests, catalog_items, users RESTART IDENTITY CASCADE');
    await client.query('ALTER SEQUENCE request_code_seq RESTART WITH 1001');

    console.log('[seed] inserting catalog...');
    for (const [name, category] of CATALOG) {
      await client.query('INSERT INTO catalog_items (name, category) VALUES ($1, $2)', [name, category]);
    }

    console.log('[seed] inserting users...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userRows = [];
    for (const u of USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password_hash, role, department)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, name, role, department`,
        [u.name, u.email, passwordHash, u.role, u.department]
      );
      userRows.push(rows[0]);
    }
    const requestors = userRows.filter((u) => u.role === 'requestor');
    const admins = userRows.filter((u) => u.role === 'admin');

    console.log('[seed] generating 30 days of requests...');
    const now = new Date();
    let created = 0;
    for (let d = 29; d >= 0; d--) {
      const perDay = rand(4) + 1;
      for (let i = 0; i < perDay; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - d);
        date.setHours(8 + rand(10), rand(60), 0, 0);

        const requestor = pick(requestors);
        const status = d > 2 ? pick(['pending', 'approved', 'rejected']) : 'pending';
        const reviewer = status === 'pending' ? null : pick(admins).id;
        const updatedAt = status === 'pending' ? null : new Date(date.getTime() + 3600000).toISOString();
        const adminNotes = status === 'rejected' ? 'Budget constraints this period.' : '';

        const { rows } = await client.query(
          `INSERT INTO requests (code, requestor_id, requestor_name, department, status, notes, admin_notes, reviewed_by, created_at, updated_at)
           VALUES ('REQ-' || nextval('request_code_seq'), $1, $2, $3, $4, '', $5, $6, $7, $8)
           RETURNING id`,
          [requestor.id, requestor.name, requestor.department, status, adminNotes, reviewer, date.toISOString(), updatedAt]
        );
        const requestId = rows[0].id;

        const numItems = rand(6) + 2;
        const picked = new Set();
        while (picked.size < numItems) picked.add(rand(CATALOG.length));
        for (const idx of picked) {
          await client.query(
            'INSERT INTO request_items (request_id, name, quantity) VALUES ($1, $2, $3)',
            [requestId, CATALOG[idx][0], rand(10) + 1]
          );
        }
        created++;
      }
    }

    await client.query('COMMIT');
    console.log(`[seed] done ✓  ${userRows.length} users, ${CATALOG.length} items, ${created} requests`);
    console.log(`[seed] demo login → any email above / password: ${DEMO_PASSWORD}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
