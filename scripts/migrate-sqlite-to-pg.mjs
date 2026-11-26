// Migrate the original SQLite database (node:sqlite, old schema) into a
// Postgres database (the new schema created by server/index.ts at boot).
//
// CLI usage:
//   DATABASE_URL=... node scripts/migrate-sqlite-to-pg.mjs <path/to/maintenance.sqlite>
//
// Also importable:
//   import { runMigration } from "./migrate-sqlite-to-pg.mjs";
//   await runMigration(sqlitePath, databaseUrl);
//
// The old schema has NO divisions/departments tables and users lack
// divisions_json/repair_units_json — those fall back to seed defaults / the
// user's own departments_json.
//
// Rows are copied as-is (case preserved). The server normalizes codes to
// uppercase at every read boundary, so mixed-case legacy codes keep working.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

function tableExists(source, name) {
  try {
    source.prepare(`SELECT 1 FROM "${name}" LIMIT 1`).get();
    return true;
  } catch {
    return false;
  }
}

export async function runMigration(sqlitePath, databaseUrl) {
  // --- Open the source SQLite database (copy first if it has a WAL) ---
  const walPath = sqlitePath + "-wal";
  let workDir = null;
  let dbFile = sqlitePath;
  if (fs.existsSync(walPath)) {
    // A live WAL cannot be read by a fresh process without the main DB; copy
    // both to a temp dir and checkpoint by opening read-write there.
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-migrate-"));
    const base = path.basename(sqlitePath);
    dbFile = path.join(workDir, base);
    fs.copyFileSync(sqlitePath, dbFile);
    fs.copyFileSync(walPath, dbFile + "-wal");
    if (fs.existsSync(sqlitePath + "-shm")) fs.copyFileSync(sqlitePath + "-shm", dbFile + "-shm");
  }
  const source = new DatabaseSync(dbFile, { readonly: workDir ? false : true });
  if (workDir) {
    // Force the WAL to merge into the main file so we read a consistent snapshot.
    try { source.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } catch {}
  }

  // Robust connection: parse the URL into explicit host/port/user/password/
  // database fields (reliable against a freshly-started embedded Postgres on
  // Windows, where raw connectionString can hit a 28P01 auth race). Respect
  // an sslmode query param in the URL; default to SSL for production URLs.
  const urlObj = new URL(databaseUrl);
  const pool = new pg.Pool({
    host: urlObj.hostname,
    port: urlObj.port ? Number(urlObj.port) : 5432,
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.replace(/^\//, "") || "postgres",
    ssl:
      urlObj.searchParams.get("sslmode") === "disable" || process.env.PGSSL === "disable"
        ? false
        : { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  // embedded-postgres on Windows can reject the very first connection right
  // after "ready" (auth/startup race, 28P01). Warm the pool with retries before
  // doing any real work (a no-op against a real, already-running Postgres).
  {
    let lastErr;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await pool.query("SELECT 1");
        break;
      } catch (e) {
        lastErr = e;
        if (attempt === 9) throw new Error("could not connect to Postgres: " + (lastErr?.message || lastErr));
        await new Promise((r) => setTimeout(r, 700));
      }
    }
  }

  async function q(text, params = []) {
    const r = await pool.query(text, params);
    return r.rows;
  }
  async function q1(text, params = []) {
    const r = await pool.query(text, params);
    return r.rows[0];
  }

  // --- Bootstrap the target schema (same DDL the server applies on boot) ---
  await q("CREATE EXTENSION IF NOT EXISTS citext");
  await q(`
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
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS repairs (
      id TEXT PRIMARY KEY,
      department TEXT NOT NULL,
      data_json TEXT NOT NULL,
      deleted_at TEXT,
      deleted_by TEXT
    )`);
  await q(`CREATE INDEX IF NOT EXISTS repairs_department_idx ON repairs(department)`);
  await q(`
    CREATE TABLE IF NOT EXISTS department_controls (
      department CITEXT PRIMARY KEY,
      status TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS department_control_history (
      id SERIAL PRIMARY KEY,
      department TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      repair_id TEXT,
      department TEXT,
      data_json TEXT NOT NULL
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      image_data TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id SERIAL PRIMARY KEY,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      occurred_at TEXT NOT NULL
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id CITEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL,
      last_activity_at BIGINT NOT NULL DEFAULT 0
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS presence (
      token_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE,
      last_seen_at BIGINT NOT NULL
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS divisions (
      code CITEXT PRIMARY KEY,
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS departments (
      code CITEXT PRIMARY KEY,
      name TEXT NOT NULL,
      division_code CITEXT NOT NULL REFERENCES divisions(code),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await q(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'))`);

  // Seed divisions/departments (same as original bootstrap) — safe to re-run.
  await q("INSERT INTO divisions (code, name, active) VALUES ('RM', 'Raw Material', TRUE) ON CONFLICT (code) DO NOTHING");
  for (const code of ["Agg1","Agg2","Agg3","Jaw1","Jaw2","Jaw3","Jaw4","Cde1","Cde2"]) {
    // Separate $1 (code, CITEXT) and $2 (name, TEXT) — reusing $1 for both
    // column types makes Postgres fail type deduction (42P08).
    await q("INSERT INTO departments (code, name, division_code, active) VALUES ($1,$2,'RM',TRUE) ON CONFLICT (code) DO NOTHING", [code, code]);
  }

  const counts = {};

  // --- users ---
  const userRows = source.prepare("SELECT * FROM users").all();
  console.log(`users: ${userRows.length} to import`);
  for (const row of userRows) {
    // Derive divisions_json from departments_json if the old row lacks it.
    let divisionsJson = row.divisions_json ?? '["RM"]';
    if (typeof divisionsJson !== "string") divisionsJson = JSON.stringify(divisionsJson);
    const repairUnitsJson = row.repair_units_json ?? "[]";
    const repairUnits = typeof repairUnitsJson === "string" ? JSON.parse(repairUnitsJson || "[]") : repairUnitsJson;
    const active = row.active === 1 || row.active === true;
    await q(
      `INSERT INTO users (user_id, name, password_hash, roles_json, departments_json, divisions_json, repair_units_json, active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id) DO UPDATE SET
         name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, roles_json=EXCLUDED.roles_json,
         departments_json=EXCLUDED.departments_json, divisions_json=EXCLUDED.divisions_json,
         repair_units_json=EXCLUDED.repair_units_json, active=EXCLUDED.active, created_at=EXCLUDED.created_at`,
      [
        String(row.user_id),
        String(row.name),
        String(row.password_hash),
        row.roles_json,
        row.departments_json,
        divisionsJson,
        typeof repairUnits === "string" ? repairUnits : JSON.stringify(repairUnits),
        active,
        row.created_at ? String(row.created_at) : new Date().toISOString(),
      ]
    );
  }
  counts.users = userRows.length;

  // --- repairs ---
  const repairRows = source.prepare("SELECT * FROM repairs").all();
  console.log(`repairs: ${repairRows.length} to import`);
  for (const row of repairRows) {
    await q(
      `INSERT INTO repairs (id, department, data_json, deleted_at, deleted_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET
         department=EXCLUDED.department, data_json=EXCLUDED.data_json,
         deleted_at=EXCLUDED.deleted_at, deleted_by=EXCLUDED.deleted_by`,
      [
        String(row.id),
        String(row.department),
        row.data_json,
        row.deleted_at ?? null,
        row.deleted_by ?? null,
      ]
    );
  }
  counts.repairs = repairRows.length;

  // --- department_controls ---
  const controlRows = source.prepare("SELECT * FROM department_controls").all();
  console.log(`department_controls: ${controlRows.length} to import`);
  for (const row of controlRows) {
    await q(
      `INSERT INTO department_controls (department, status, updated_by, updated_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (department) DO UPDATE SET
         status=EXCLUDED.status, updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at`,
      [String(row.department), String(row.status), String(row.updated_by), String(row.updated_at)]
    );
  }
  counts.department_controls = controlRows.length;

  // --- department_control_history ---
  const historyRows = source.prepare("SELECT * FROM department_control_history ORDER BY id").all();
  console.log(`department_control_history: ${historyRows.length} to import`);
  for (const row of historyRows) {
    await q(
      `INSERT INTO department_control_history (id, department, status, reason, updated_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         department=EXCLUDED.department, status=EXCLUDED.status, reason=EXCLUDED.reason,
         updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at`,
      [Number(row.id), String(row.department), String(row.status), String(row.reason ?? ""), String(row.updated_by), String(row.updated_at)]
    );
  }
  counts.department_control_history = historyRows.length;

  // --- audit_logs ---
  const auditRows = source.prepare("SELECT * FROM audit_logs").all();
  console.log(`audit_logs: ${auditRows.length} to import`);
  for (const row of auditRows) {
    await q(
      `INSERT INTO audit_logs (id, repair_id, department, data_json)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET
         repair_id=EXCLUDED.repair_id, department=EXCLUDED.department, data_json=EXCLUDED.data_json`,
      [String(row.id), row.repair_id ?? null, row.department ?? null, row.data_json]
    );
  }
  counts.audit_logs = auditRows.length;

  // --- announcements (present in new schema; may be absent in old DB) ---
  if (tableExists(source, "announcements")) {
    const annRows = source.prepare("SELECT * FROM announcements").all();
    console.log(`announcements: ${annRows.length} to import`);
    for (const row of annRows) {
      await q(
        `INSERT INTO announcements (id, image_data, created_by, created_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET image_data=EXCLUDED.image_data, created_by=EXCLUDED.created_by, created_at=EXCLUDED.created_at`,
        [String(row.id), String(row.image_data), String(row.created_by), String(row.created_at)]
      );
    }
    counts.announcements = annRows.length;
  } else {
    console.log("announcements: not in source, skipping");
  }

  // --- admin_audit_logs ---
  const adminRows = source.prepare("SELECT * FROM admin_audit_logs ORDER BY id").all();
  console.log(`admin_audit_logs: ${adminRows.length} to import`);
  for (const row of adminRows) {
    await q(
      `INSERT INTO admin_audit_logs (id, actor, action, target_type, target_id, details, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         actor=EXCLUDED.actor, action=EXCLUDED.action, target_type=EXCLUDED.target_type,
         target_id=EXCLUDED.target_id, details=EXCLUDED.details, occurred_at=EXCLUDED.occurred_at`,
      [Number(row.id), String(row.actor), String(row.action), String(row.target_type), String(row.target_id), String(row.details ?? ""), String(row.occurred_at)]
    );
  }
  counts.admin_audit_logs = adminRows.length;

  // --- sessions (only those whose user still exists) ---
  const sessionRows = source.prepare("SELECT * FROM sessions").all();
  console.log(`sessions: ${sessionRows.length} to import`);
  for (const row of sessionRows) {
    const userExists = await q1("SELECT 1 AS x FROM users WHERE user_id = $1", [String(row.user_id)]);
    if (!userExists) continue;
    await q(
      `INSERT INTO sessions (token_hash, user_id, expires_at, last_activity_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (token_hash) DO UPDATE SET
         user_id=EXCLUDED.user_id, expires_at=EXCLUDED.expires_at, last_activity_at=EXCLUDED.last_activity_at`,
      [String(row.token_hash), String(row.user_id), Number(row.expires_at), Number(row.last_activity_at ?? 0)]
    );
  }
  counts.sessions = sessionRows.length;

  // --- presence (only matching a session) ---
  const presenceRows = source.prepare("SELECT * FROM presence").all();
  console.log(`presence: ${presenceRows.length} to import`);
  for (const row of presenceRows) {
    const sessionExists = await q1("SELECT 1 AS x FROM sessions WHERE token_hash = $1", [String(row.token_hash)]);
    if (!sessionExists) continue;
    await q(
      `INSERT INTO presence (token_hash, last_seen_at) VALUES ($1,$2)
       ON CONFLICT (token_hash) DO UPDATE SET last_seen_at=EXCLUDED.last_seen_at`,
      [String(row.token_hash), Number(row.last_seen_at)]
    );
  }
  counts.presence = presenceRows.length;

  // --- divisions / departments (only if the source has them) ---
  if (tableExists(source, "divisions")) {
    const divRows = source.prepare("SELECT * FROM divisions").all();
    console.log(`divisions: ${divRows.length} to import`);
    for (const row of divRows) {
      await q(
        `INSERT INTO divisions (code, name, active, created_at) VALUES ($1,$2,$3,$4)
         ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, active=EXCLUDED.active`,
        [String(row.code), String(row.name), row.active === 1 || row.active === true, row.created_at ? String(row.created_at) : new Date().toISOString()]
      );
    }
  } else {
    console.log("divisions: not in source, using seed");
  }
  if (tableExists(source, "departments")) {
    const depRows = source.prepare("SELECT * FROM departments").all();
    console.log(`departments: ${depRows.length} to import`);
    for (const row of depRows) {
      await q(
        `INSERT INTO departments (code, name, division_code, active, created_at) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, division_code=EXCLUDED.division_code, active=EXCLUDED.active`,
        [String(row.code), String(row.name), String(row.division_code ?? "RM"), row.active === 1 || row.active === true, row.created_at ? String(row.created_at) : new Date().toISOString()]
      );
    }
  } else {
    console.log("departments: not in source, using seed");
  }

  // --- Report final counts ---
  console.log("\n===== Postgres counts after migration =====");
  const report = ["users","repairs","department_controls","department_control_history","audit_logs","announcements","admin_audit_logs","sessions","presence","divisions","departments"];
  for (const t of report) {
    const r = await pool.query(`SELECT COUNT(*) AS c FROM ${t}`);
    console.log(`  ${t}: ${r.rows[0].c}`);
    counts[`final_${t}`] = Number(r.rows[0].c);
  }

  await pool.end();
  source.close();
  if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
  console.log("\nMigration complete.");
  return counts;
}

// CLI entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sqlitePath = process.argv[2];
  const databaseUrl = process.env.DATABASE_URL;
  if (!sqlitePath || !databaseUrl) {
    console.error("usage: DATABASE_URL=... node scripts/migrate-sqlite-to-pg.mjs <path/to/maintenance.sqlite>");
    process.exit(2);
  }
  runMigration(sqlitePath, databaseUrl).catch((e) => {
    console.error("MIGRATION ERROR:", e);
    process.exitCode = 1;
  });
}
