-- ART Maintenance System — Supabase (Postgres) schema
-- Run this in the Supabase SQL Editor (or psql) ONCE before first server start.
-- The Node server (server/index.ts) also creates these tables idempotently on boot,
-- so this file is only needed to pre-apply the schema on Supabase manually.
--
-- Notes:
--   * CITEXT = case-insensitive unique codes (matches SQLite COLLATE NOCASE).
--   * JSON payloads are stored as TEXT so large repair payloads (base64 images)
--     are handled exactly like the original SQLite version.
--   * Session/presence expiry values are epoch milliseconds in BIGINT.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  user_id CITEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  roles_json TEXT NOT NULL,
  departments_json TEXT NOT NULL,
  divisions_json TEXT NOT NULL DEFAULT '["RM"]',
  repair_units_json TEXT NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repairs (
  id TEXT PRIMARY KEY,
  department TEXT NOT NULL,
  data_json TEXT NOT NULL,
  deleted_at TEXT,
  deleted_by TEXT
);
CREATE INDEX IF NOT EXISTS repairs_department_idx ON repairs(department);

CREATE TABLE IF NOT EXISTS department_controls (
  department CITEXT PRIMARY KEY,
  status TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS department_control_history (
  id SERIAL PRIMARY KEY,
  department TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS department_control_history_department_idx ON department_control_history(department, id DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  repair_id TEXT,
  department TEXT,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  image_data TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS announcements_created_at_idx ON announcements(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_audit_logs_time_idx ON admin_audit_logs(id DESC);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id CITEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  last_activity_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS presence (
  token_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE,
  last_seen_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS divisions (
  code CITEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  code CITEXT PRIMARY KEY,
  name TEXT NOT NULL,
  division_code CITEXT NOT NULL REFERENCES divisions(code),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- Seeds (same as the original SQLite bootstrap). Safe to re-run.
INSERT INTO divisions (code, name, active) VALUES ('RM', 'Raw Material', TRUE)
  ON CONFLICT (code) DO NOTHING;
INSERT INTO departments (code, name, division_code, active) VALUES
  ('Agg1', 'Agg1', 'RM', TRUE),
  ('Agg2', 'Agg2', 'RM', TRUE),
  ('Agg3', 'Agg3', 'RM', TRUE),
  ('Jaw1', 'Jaw1', 'RM', TRUE),
  ('Jaw2', 'Jaw2', 'RM', TRUE),
  ('Jaw3', 'Jaw3', 'RM', TRUE),
  ('Jaw4', 'Jaw4', 'RM', TRUE),
  ('Cde1', 'Cde1', 'RM', TRUE),
  ('Cde2', 'Cde2', 'RM', TRUE)
  ON CONFLICT (code) DO NOTHING;
