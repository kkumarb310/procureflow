import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL is not set — check your .env file.');
}

// Hosted Postgres (Neon, Render, Supabase) requires SSL. Toggle via PGSSL=true.
const useSsl = process.env.PGSSL === 'true';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error', err);
});

/** Thin query helper so routes don't import Pool directly. */
export const query = (text, params) => pool.query(text, params);
