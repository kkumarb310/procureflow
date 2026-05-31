-- ProcureFlow schema
-- Run via: npm run migrate

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'requestor' CHECK (role IN ('requestor', 'admin')),
  department    TEXT NOT NULL DEFAULT 'General',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_items (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  category   TEXT NOT NULL DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  requestor_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requestor_name TEXT NOT NULL,
  department    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes         TEXT NOT NULL DEFAULT '',
  admin_notes   TEXT NOT NULL DEFAULT '',
  reviewed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS request_items (
  id          SERIAL PRIMARY KEY,
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_requests_requestor ON requests(requestor_id);
CREATE INDEX IF NOT EXISTS idx_requests_status    ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created    ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_request_items_req   ON request_items(request_id);

-- Sequence used to generate human-friendly request codes (REQ-1001, REQ-1002 ...)
CREATE SEQUENCE IF NOT EXISTS request_code_seq START 1001;
