import { createServer } from "node:http";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import pg from "pg";

const scrypt = promisify(scryptCallback) as (password: string, salt: string, keyLength: number) => Promise<Buffer>;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.resolve(process.env.DATA_DIR || (process.platform === "win32" ? "D:/MC-Maintenance-system-data" : path.join(root, "data")));
const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(dataDir, "backups"));
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST?.trim() || "0.0.0.0";
const divisionSeeds: Array<{ code: string; name: string }> = [{ code: "RM", name: "Raw Material" }];
const departmentSeeds: Array<{ code: string; name: string; divisionCode: string }> = ["Agg1", "Agg2", "Agg3", "Jaw1", "Jaw2", "Jaw3", "Jaw4", "Cde1", "Cde2"].map((code) => ({ code, name: code, divisionCode: "RM" }));
const repairUnitCodes = ["Maintenance", "Electrical", "Instrument"];
const cookieName = "cm_session";
const sessionDays = 365;
const maxConcurrentUsers = 20;
const loginAttempts = new Map();

// ---------------------------------------------------------------------------
// Postgres pool (replaces the sync node:sqlite DatabaseSync).
// DATABASE_URL is provided by Supabase / Render. `ssl` only kicks in when the
// connection string does not already specify `sslmode`, so explicit URIs win.
// ---------------------------------------------------------------------------
// Parse DATABASE_URL into explicit connection fields. This is more robust
// than passing the raw connectionString to pg: against a freshly-started
// local/embedded Postgres on Windows, connectionString connections can hit a
// 28P01 auth race, while explicit host/port/user/password/database connect
// reliably. (Against a stable production Postgres either form works.)
const databaseUrl = process.env.DATABASE_URL;
let dbUrl: URL;
try {
  dbUrl = new URL(databaseUrl || "");
} catch {
  throw new Error("DATABASE_URL ไม่ถูกต้อง: กรุณาตั้งเป็น PostgreSQL connection URL ในไฟล์ .env");
}
if (!["postgres:", "postgresql:"].includes(dbUrl.protocol)) {
  throw new Error("DATABASE_URL ต้องเป็น PostgreSQL connection URL ไม่ใช่พาธโฟลเดอร์");
}
const poolConfig = {
  host: dbUrl.hostname,
  port: dbUrl.port ? Number(dbUrl.port) : 5432,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.replace(/^\//, "") || "postgres",
  // Respect an sslmode in the URL itself (e.g. ...?sslmode=disable for local
  // embedded Postgres); otherwise default to SSL with a self-signed cert
  // tolerance (Supabase/Render), overridable via PGSSL=disable.
  ssl:
    dbUrl.searchParams.get("sslmode") === "disable" || process.env.PGSSL === "disable"
      ? false
      : { rejectUnauthorized: false },
  // Supabase session poolers commonly cap concurrent clients at 15 across
  // every app instance sharing the project. Keep one server instance modest.
  max: 5,
  connectionTimeoutMillis: 10_000,
};
const pool = new pg.Pool(poolConfig);
pool.on("error", (err) => { console.error("Postgres pool error:", err); });

// ---------------------------------------------------------------------------
// Low-level query helpers. Postgres uses $1/$2 positional params (not ?) and
// returns int8 / bigint columns as strings, so counts are coerced to Number.
// ---------------------------------------------------------------------------
async function q(text: string, params: any[] = []): Promise<any[]> {
  const result = await pool.query(text, params);
  return result.rows;
}
async function q1(text: string, params: any[] = []): Promise<any | undefined> {
  const result = await pool.query(text, params);
  return result.rows[0];
}
async function qCount(text: string, params: any[] = []): Promise<number> {
  const result = await pool.query(text, params);
  return Number(result.rows[0]?.count ?? 0);
}
// Build numbered placeholders ($1,$2,...) for a Postgres IN (...) list.
function inPlaceholders(count: number): string {
  return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(",");
}
// Run a unit of work inside a single transaction. The client is held for the
// whole BEGIN/COMMIT/ROLLBACK so every statement shares one connection, which
// mirrors the original SQLite `BEGIN IMMEDIATE` semantics.
async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function cq(client: pg.PoolClient, text: string, params: any[] = []): Promise<any[]> {
  const result = await client.query(text, params);
  return result.rows;
}
async function cq1(client: pg.PoolClient, text: string, params: any[] = []): Promise<any | undefined> {
  const result = await client.query(text, params);
  return result.rows[0];
}
async function cqCount(client: pg.PoolClient, text: string, params: any[] = []): Promise<number> {
  const result = await client.query(text, params);
  return Number(result.rows[0]?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Database bootstrap (idempotent). Mirrors the original SQLite DDL + seeds so
// the server works on a brand-new Postgres database without a manual schema.
// ---------------------------------------------------------------------------
const organizationConfigExisted = Boolean((await q("SELECT 1 FROM information_schema.tables WHERE table_name = 'divisions'")).length);
// The CITEXT type lives in a Postgres extension. On Supabase it is preinstalled,
// but a bare Postgres (Render, local, etc.) needs it created explicitly. Safe
// to run repeatedly — IF NOT EXISTS makes it idempotent.
await pool.query("CREATE EXTENSION IF NOT EXISTS citext");
await pool.query(`
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
  CREATE TABLE IF NOT EXISTS repairs (id TEXT PRIMARY KEY, department TEXT NOT NULL, data_json TEXT NOT NULL, deleted_at TEXT, deleted_by TEXT);
  CREATE INDEX IF NOT EXISTS repairs_department_idx ON repairs(department);
  CREATE TABLE IF NOT EXISTS department_controls (department CITEXT PRIMARY KEY, status TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS department_control_history (
    id SERIAL PRIMARY KEY,
    department TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS department_control_history_department_idx ON department_control_history(department, id DESC);
  CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, repair_id TEXT, department TEXT, data_json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, image_data TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS announcements_created_at_idx ON announcements(created_at DESC);
  CREATE TABLE IF NOT EXISTS admin_audit_logs (id SERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', occurred_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS admin_audit_logs_time_idx ON admin_audit_logs(id DESC);
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id CITEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, expires_at BIGINT NOT NULL, last_activity_at BIGINT NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS presence (token_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE, last_seen_at BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS divisions (code CITEXT PRIMARY KEY, name TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS departments (code CITEXT PRIMARY KEY, name TEXT NOT NULL, division_code CITEXT NOT NULL REFERENCES divisions(code), active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'));
`);
// ---------------------------------------------------------------------------
// Data version: one counter bumped by a trigger whenever shared data changes.
// GET /api/data?since=<version> answers "unchanged" with a tiny response, so
// polling clients stop re-downloading every repair and audit log from Postgres.
// Sessions and presence are deliberately excluded (they change every few seconds).
// ---------------------------------------------------------------------------
await pool.query(`
  CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  INSERT INTO app_state (key, value) VALUES ('data_version', '1') ON CONFLICT (key) DO NOTHING;
  CREATE OR REPLACE FUNCTION bump_data_version() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    UPDATE app_state SET value = (value::bigint + 1)::text WHERE key = 'data_version';
    RETURN NULL;
  END $$;
`);
for (const table of ["repairs", "audit_logs", "users", "department_controls", "department_control_history", "admin_audit_logs", "divisions", "departments"]) {
  await pool.query(`DROP TRIGGER IF EXISTS ${table}_bump_data_version ON ${table}`);
  await pool.query(`CREATE TRIGGER ${table}_bump_data_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION bump_data_version()`);
}
async function currentDataVersion(): Promise<string> {
  return (await q1("SELECT value FROM app_state WHERE key = 'data_version'"))?.value || "0";
}

// Keep SERIAL sequences ahead of any rows imported or restored from backups.
await pool.query("SELECT setval(pg_get_serial_sequence('department_control_history', 'id'), COALESCE(MAX(id), 1), COUNT(*) > 0) FROM department_control_history");
await pool.query("SELECT setval(pg_get_serial_sequence('admin_audit_logs', 'id'), COALESCE(MAX(id), 1), COUNT(*) > 0) FROM admin_audit_logs");
await mkdir(dataDir, { recursive: true });
await mkdir(backupDir, { recursive: true });

// --- Column migrations (mirrors the original PRAGMA table_info checks) ---
const sessionColumns = (await q("SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions'")).map((c) => c.column_name);
if (!sessionColumns.includes("last_activity_at")) {
  await pool.query("ALTER TABLE sessions ADD COLUMN last_activity_at BIGINT NOT NULL DEFAULT 0");
  await pool.query("UPDATE sessions SET last_activity_at = $1 WHERE last_activity_at = 0", [Date.now()]);
}
const repairColumns = (await q("SELECT column_name FROM information_schema.columns WHERE table_name = 'repairs'")).map((c) => c.column_name);
if (!repairColumns.includes("deleted_at")) await pool.query("ALTER TABLE repairs ADD COLUMN deleted_at TEXT");
if (!repairColumns.includes("deleted_by")) await pool.query("ALTER TABLE repairs ADD COLUMN deleted_by TEXT");
const userColumns = (await q("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")).map((c) => c.column_name);
if (!userColumns.includes("divisions_json")) {
  await pool.query("ALTER TABLE users ADD COLUMN divisions_json TEXT NOT NULL DEFAULT '[\"RM\"]'");
  const adminRows = await q("SELECT user_id FROM users WHERE roles_json LIKE '%\"admin\"%'");
  for (const row of adminRows) await pool.query("UPDATE users SET divisions_json = $1 WHERE user_id = $2", [JSON.stringify(divisionSeeds.map((item) => item.code)), row.user_id]);
}
if (!userColumns.includes("repair_units_json")) {
  await pool.query("ALTER TABLE users ADD COLUMN repair_units_json TEXT NOT NULL DEFAULT '[]'");
  await pool.query("UPDATE users SET repair_units_json = $1 WHERE roles_json LIKE $2", [JSON.stringify(repairUnitCodes), '%"technician"%']);
}

if (!organizationConfigExisted) await pool.query("UPDATE users SET divisions_json = $1", [JSON.stringify(divisionSeeds.map((item) => item.code))]);
for (const division of divisionSeeds) await pool.query("INSERT INTO divisions (code, name, active) VALUES ($1, $2, TRUE) ON CONFLICT (code) DO NOTHING", [division.code, division.name]);
for (const department of departmentSeeds) await pool.query("INSERT INTO departments (code, name, division_code, active) VALUES ($1, $2, $3, TRUE) ON CONFLICT (code) DO NOTHING", [department.code, department.name, department.divisionCode]);
if (!(await q1("SELECT 1 FROM schema_migrations WHERE id = $1", ["raw-material-org-migration-v1"]))) {
  await pool.query("UPDATE divisions SET name = 'Raw Material', active = (code = 'RM')");
  await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", ["raw-material-org-migration-v1"]);
}

// --- First-start bootstrap admin (mirrors the original) ---
const bootstrapId = process.env.ADMIN_USER_ID?.trim();
const bootstrapPassword = process.env.ADMIN_PASSWORD;
if (await qCount("SELECT COUNT(*) AS count FROM users") === 0) {
  if (!bootstrapId || !bootstrapPassword || bootstrapPassword.length < 6 || /replace-with|change[_ -]?me|example/i.test(bootstrapPassword)) {
    console.error("First start requires ADMIN_USER_ID and ADMIN_PASSWORD (at least 6 characters). Copy .env.example to .env and set them.");
    process.exit(1);
  }
  await pool.query("INSERT INTO users (user_id, name, password_hash, roles_json, departments_json, divisions_json) VALUES ($1, $2, $3, $4, $5, $6)", [
    bootstrapId, "ผู้ดูแลระบบ", await passwordHash(bootstrapPassword), JSON.stringify(["admin"]), JSON.stringify(departmentSeeds.map((item) => item.code)), JSON.stringify(divisionSeeds.map((item) => item.code)),
  ]);
}

function getDivisionRecords() {
  return q("SELECT code, name, active FROM divisions ORDER BY code").then((rows) => rows.map((row) => ({ ...row, code: upper(row.code), active: Boolean(row.active) })));
}
function getDepartmentRecords() {
  return q(`SELECT d.code, d.name, d.division_code AS "divisionCode", d.active, v.name AS "divisionName", v.active AS "divisionActive" FROM departments d JOIN divisions v ON v.code = d.division_code ORDER BY d.division_code, d.code`)
    .then((rows) => rows.map((row) => ({ ...row, code: upper(row.code), divisionCode: upper(row.divisionCode), active: Boolean(row.active), divisionActive: Boolean(row.divisionActive), effectiveActive: Boolean(row.active && row.divisionActive) })));
}
async function divisionCodes(activeOnly = false): Promise<string[]> {
  return (await q(`SELECT code FROM divisions ${activeOnly ? "WHERE active = TRUE" : ""}`)).map((row) => upper(row.code));
}
async function departmentCodes(activeOnly = false): Promise<string[]> {
  return (await getDepartmentRecords()).filter((row) => !activeOnly || row.effectiveActive).map((row) => upper(row.code));
}
async function departmentDivisionCode(code: string): Promise<string | null> {
  const row = await q1("SELECT division_code AS \"divisionCode\" FROM departments WHERE code = $1", [code]);
  return row?.divisionCode || null;
}

const json = (request, response, status, value, headers = {}) => {
  const origin = request.headers.origin;
  const allHeaders = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers };
  if (origin) {
    allHeaders["Access-Control-Allow-Origin"] = origin;
    allHeaders["Vary"] = "Origin";
    allHeaders["Access-Control-Allow-Credentials"] = "true";
  }
  const body = JSON.stringify(value);
  // JSON compresses ~5-10x. Skip tiny bodies where gzip overhead isn't worth it.
  if (body.length > 1024 && /\bgzip\b/.test(String(request.headers["accept-encoding"] || ""))) {
    allHeaders["Content-Encoding"] = "gzip";
    allHeaders["Vary"] = allHeaders["Vary"] ? `${allHeaders["Vary"]}, Accept-Encoding` : "Accept-Encoding";
    response.writeHead(status, allHeaders);
    response.end(gzipSync(body, { level: 6 }));
    return;
  }
  response.writeHead(status, allHeaders);
  response.end(body);
};
// Key-order-insensitive JSON for comparing records. Repairs read through jsonb
// come back with Postgres' key order, so plain JSON.stringify would report
// identical records as different and reject legitimate workflow steps.
function stableJson(value: any): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]]))
    : item);
}
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
// Cross-site cookie: Pages (github.io) -> Render (onrender.com) is cross-site,
// so the session cookie must be SameSite=None + Secure to be sent with
// `credentials: "include"` over HTTPS.
const cookie = (token, maxAge) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${maxAge}`;

// Allowed write origins. When ALLOWED_ORIGINS is unset the server is permissive
// (any https/http origin) so the first deploy works; set it to lock down later.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
function originAllowed(origin: string | undefined) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (!allowedOrigins.length) return true;
  return false;
}

async function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
async function passwordMatches(password, stored) {
  const [, salt, expectedHex] = String(stored).split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

let activeBackup = null;
async function createDatabaseBackup({ force = false, includeImages = true } = {}) {
  if (activeBackup) return activeBackup;
  activeBackup = (async () => {
    // Logical backup: export the business tables to a JSON snapshot. Supabase
    // handles physical backups on the database itself, so this is a convenience
    // export for admins rather than a SQLite file copy.
    await mkdir(backupDir, { recursive: true });
    const backupNames = (await readdir(backupDir))
      .filter((name) => /^maintenance-\d{4}-\d{2}-\d{2}T.*\.json$/i.test(name))
      .sort()
      .reverse();
    if (!force && backupNames.length) {
      const latestPath = path.join(backupDir, backupNames[0]);
      const latest = await stat(latestPath);
      if (Date.now() - latest.mtimeMs < 20 * 60 * 60 * 1000) {
        return { skipped: true, fileName: backupNames[0], directory: backupDir };
      }
    }

    const createdAt = new Date();
    const stamp = createdAt.toISOString().replace(/[:.]/g, "-");
    const fileName = `maintenance-${stamp}.json`;
    const destination = path.join(backupDir, fileName);
    const temporaryPath = `${destination}.partial-${process.pid}`;
    const [users, repairs, auditLogs, departmentControls, departmentControlHistory, announcements, adminAuditLogs, divisions, departments] = await Promise.all([
      q("SELECT user_id, name, roles_json, departments_json, divisions_json, repair_units_json, active FROM users").then((rows) => rows.map((row) => ({ ...row, active: Boolean(row.active) }))),
      includeImages
        ? q("SELECT id, department, data_json, deleted_at, deleted_by FROM repairs")
        : q("SELECT id, department, (data_json::jsonb - 'images')::text AS data_json, deleted_at, deleted_by FROM repairs"),
      q("SELECT id, repair_id, department, data_json FROM audit_logs"),
      q("SELECT department, status, updated_by, updated_at FROM department_controls"),
      q("SELECT id, department, status, reason, updated_by, updated_at FROM department_control_history"),
      includeImages
        ? q("SELECT id, image_data, created_by, created_at FROM announcements")
        : q("SELECT id, created_by, created_at FROM announcements"),
      q("SELECT id, actor, action, target_type, target_id, details, occurred_at FROM admin_audit_logs"),
      q("SELECT code, name, active FROM divisions").then((rows) => rows.map((row) => ({ ...row, active: Boolean(row.active) }))),
      q("SELECT code, name, division_code, active FROM departments").then((rows) => rows.map((row) => ({ ...row, active: Boolean(row.active) }))),
    ]);
    const snapshot = { exportedAt: createdAt.toISOString(), includesImages: includeImages, users, repairs, auditLogs, departmentControls, departmentControlHistory, announcements, adminAuditLogs, divisions, departments };
    try {
      await writeFile(temporaryPath, JSON.stringify(snapshot, null, 2));
      await rename(temporaryPath, destination);
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      throw error;
    }

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const name of backupNames) {
      const oldPath = path.join(backupDir, name);
      try {
        if ((await stat(oldPath)).mtimeMs < cutoff) await rm(oldPath, { force: true });
      } catch (error) {
        console.warn(`Could not prune an old database backup (${name}):`, error.message);
      }
    }
    const backupStat = await stat(destination);
    return { fileName, directory: backupDir, createdAt: createdAt.toISOString(), sizeBytes: backupStat.size };
  })();
  try {
    return await activeBackup;
  } finally {
    activeBackup = null;
  }
}

// AUTO_BACKUP controls the automatic daily snapshot:
//   full      (default) everything, including photos
//   no-images repairs and logs only; photos stay in Postgres (much smaller)
//   off       no automatic snapshot; "Back up now" in the admin page still works
// The last run time is stored in Postgres, not only on disk, because hosts such
// as Render wipe the disk on every restart. Without this, each restart pulled
// the entire database (photos included) out of Postgres again.
const autoBackupMode = ["full", "no-images", "off"].includes(String(process.env.AUTO_BACKUP)) ? String(process.env.AUTO_BACKUP) : "full";
const AUTO_BACKUP_INTERVAL_MS = 20 * 60 * 60 * 1000;
const runAutomaticBackup = async () => {
  if (autoBackupMode === "off") return;
  try {
    const lastRun = Number((await q1("SELECT value FROM app_state WHERE key = 'last_auto_backup_at'"))?.value || 0);
    if (Date.now() - lastRun < AUTO_BACKUP_INTERVAL_MS) return;
    const result = await createDatabaseBackup({ includeImages: autoBackupMode === "full" });
    await pool.query("INSERT INTO app_state (key, value) VALUES ('last_auto_backup_at', $1) ON CONFLICT (key) DO UPDATE SET value = excluded.value", [String(Date.now())]);
    if (!result.skipped) console.info(`Database backup created: ${result.fileName}`);
  } catch (error) {
    console.error("Automatic database backup failed:", error);
  }
};
void runAutomaticBackup();
// Check hourly; the stored timestamp decides whether a snapshot is actually due.
const backupInterval = setInterval(() => void runAutomaticBackup(), 60 * 60 * 1000);
backupInterval.unref();

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim().split(/=(.*)/s)).filter(([key, value]) => key && value !== undefined));
}
function readBody(request: import("node:http").IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000_000) reject(new Error("Request body too large"));
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("Invalid JSON")); }
    });
    request.on("error", reject);
  });
}
// Code columns are CITEXT (Postgres uppercases stored codes). JSON arrays and
// inbound payloads may carry mixed-case codes ("Agg1" from the localStorage
// migration or hand-built requests), so normalize to UPPERCASE at the
// read/write boundary to keep `.includes()` comparisons consistent.
const upper = (value) => (typeof value === "string" ? value.toUpperCase() : value);
function userFromRow(row) {
  const roles = JSON.parse(row.roles_json);
  return {
    userId: row.user_id,
    name: row.name,
    roles,
    departments: JSON.parse(row.departments_json).map(upper),
    divisions: (row.divisions_json ? JSON.parse(row.divisions_json) : ["RM"]).map(upper),
    // Repair units are named codes ("Maintenance"), not CITEXT org codes. Map them
    // back to their canonical spelling instead of uppercasing, otherwise
    // "MAINTENANCE" never matches and technicians are blocked from every job.
    repairUnits: (row.repair_units_json ? JSON.parse(row.repair_units_json) : (roles.includes("technician") ? [...repairUnitCodes] : []))
      .map((unit) => repairUnitCodes.find((code) => code.toLowerCase() === String(unit).toLowerCase()))
      .filter(Boolean),
  };
}
async function withRequesterNames(repairs) {
  // Department codes are stored in CITEXT columns (uppercase in the DB), but
  // legacy / localStorage-migrated records may carry mixed case. Normalize
  // at the read boundary so client-side `.includes()` comparisons are stable.
  const normalizedRepairs = repairs.map((repair) => repair && typeof repair.department === "string"
    ? { ...repair, department: upper(repair.department) }
    : repair);
  const referencedUserIds = [...new Set(normalizedRepairs.flatMap((repair) => [repair?.requester, repair?.inspectedBy]).filter(Boolean))];
  const referencedUserRows = referencedUserIds.length
    ? await q("SELECT user_id, name FROM users WHERE user_id = ANY($1::citext[])", [referencedUserIds])
    : [];
  const referencedUserNames = new Map(referencedUserRows.map((row) => [String(row.user_id).toLowerCase(), row.name]));
  return normalizedRepairs.map((repair) => ({
    ...repair,
    requesterName: referencedUserNames.get(String(repair?.requester || "").toLowerCase()) || repair?.requester || "ไม่ระบุ",
    inspectedByName: referencedUserNames.get(String(repair?.inspectedBy || "").toLowerCase()) || repair?.inspectedBy || "ไม่ระบุ",
  }));
}
async function withRequesterName(repair) {
  return (await withRequesterNames([repair]))[0];
}
function isAdmin(user) { return user?.roles?.includes("admin") === true; }
async function clientVisibleUser(user) {
  if (isAdmin(user)) return user;
  const [activeDivisions, activeDepartments] = await Promise.all([divisionCodes(true), departmentCodes(true)]);
  return {
    ...user,
    divisions: user.divisions.filter((code) => activeDivisions.includes(code.toUpperCase())),
    departments: user.departments.filter((code) => activeDepartments.includes(code.toUpperCase())),
  };
}
async function recordAdminAudit(actor, action, targetType, targetId, details = "", client: pg.PoolClient | pg.Pool = pool) {
  await client.query("INSERT INTO admin_audit_logs (actor, action, target_type, target_id, details, occurred_at) VALUES ($1, $2, $3, $4, $5, $6)", [actor, action, targetType, String(targetId), String(details).slice(0, 1000), new Date().toISOString()]);
}
function hasRole(user, role) { return isAdmin(user) || user?.roles?.includes(role) === true; }
function repairUnitFor(value) {
  const legacyValues = { "รอได้ไม่เกิน 3 วัน": "Maintenance", "รอได้ไม่เกิน 1 วัน": "Electrical", "ซ่อมด่วนทันที": "Instrument" };
  const normalized = legacyValues[value] || value;
  return repairUnitCodes.includes(normalized) ? normalized : "Maintenance";
}
function canTechnicianHandleRepair(user, repair) {
  return !user?.roles?.includes("technician") || user.repairUnits?.includes(repairUnitFor(repair?.urgency));
}
function canDeleteRepairs(user) { return isAdmin(user); }
function storedRepairFields(repair) {
  const storedRepair = { ...repair };
  delete storedRepair.requesterName;
  delete storedRepair.inspectedByName;
  return storedRepair;
}
function isApprovalRejectionUpdate(previous, next, user) {
  if (!hasRole(user, "approver") || next.status !== "รออนุมัติ") return false;
  const previousHistory = Array.isArray(previous.approvalRejections)
    ? previous.approvalRejections
    : previous.approvalRejectedBy
      ? [{
          reason: previous.approvalRejectReason || "ไม่ระบุเหตุผล",
          rejectedBy: previous.approvalRejectedBy,
          rejectedAt: previous.approvalRejectedAt || "",
        }]
      : [];
  const nextHistory = Array.isArray(next.approvalRejections) ? next.approvalRejections : [];
  if (nextHistory.length !== previousHistory.length + 1) return false;
  if (stableJson(nextHistory.slice(0, previousHistory.length)) !== stableJson(previousHistory)) return false;
  const rejection = nextHistory.at(-1);
  if (!String(rejection?.reason || "").trim() || rejection?.rejectedBy !== user.userId) return false;
  if (!Number.isFinite(Date.parse(rejection?.rejectedAt || ""))) return false;
  if (next.approvalRejectReason !== rejection.reason || next.approvalRejectedBy !== user.userId || next.approvalRejectedAt !== rejection.rejectedAt) return false;
  const omitDecisionData = (repair) => {
    const { approvalRejections, approvalRejectReason, approvalRejectedBy, approvalRejectedAt, ...unchangedFields } = repair;
    return storedRepairFields(unchangedFields);
  };
  return stableJson(omitDecisionData(previous)) === stableJson(omitDecisionData(next));
}
function canChangeRepair(user, previous, next) {
  if (next.status === "ไม่อนุมัติ" && !String(next.approvalRejectReason || "").trim()) return false;
  if (isAdmin(user)) return true;
  if (!previous) return next.status === "รออนุมัติ" && hasRole(user, "user");
  if (previous.status === next.status) {
    if (previous.status === "รออนุมัติ") return isApprovalRejectionUpdate(previous, next, user);
    return previous.status === "กำลังซ่อม" && hasRole(user, "technician") && canTechnicianHandleRepair(user, previous);
  }

  const transition = `${previous.status}->${next.status}`;
  if (transition === "รออนุมัติ->รอรับงาน") {
    if (!hasRole(user, "approver") || !["งานด่วน", "งานรอวางแผน"].includes(next.approvalWorkType)) return false;
    if (next.approvedBy !== user.userId || !Number.isFinite(Date.parse(next.approvedAt || ""))) return false;
    const omitApprovalDecision = (repair) => {
      const { status, approvalWorkType, approvedBy, approvedAt, ...unchangedFields } = repair;
      return storedRepairFields(unchangedFields);
    };
    return stableJson(omitApprovalDecision(previous)) === stableJson(omitApprovalDecision(next));
  }
  if (["รอรับงาน->รอเสนอเวลาซ่อม", "รอเสนอเวลาซ่อม->กำลังซ่อม", "กำลังซ่อม->รอตรวจงาน"].includes(transition)) return hasRole(user, "technician") && canTechnicianHandleRepair(user, previous);
  if (["รอตรวจงาน->จบงาน", "รอตรวจงาน->กำลังซ่อม"].includes(transition)) return hasRole(user, "inspector");
  return false;
}
async function authenticate(request) {
  const token = parseCookies(request.headers.cookie)[cookieName];
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = await q1(`SELECT users.* FROM sessions JOIN users ON users.user_id = sessions.user_id
    WHERE sessions.token_hash = $1 AND sessions.expires_at > $2 AND users.active = TRUE`, [tokenHash, Date.now()]);
  return row ? userFromRow(row) : null;
}
function safeRepair(repair: any) {
  return repair && typeof repair.id === "string" && typeof repair.department === "string" && inActiveCodeCache(repair.department);
}
// departmentCodes() is async but safeRepair() and the PUT /api/repairs and
// /api/audit-logs validations run in tight loops over arrays, so we keep a
// synchronous cache of the department code sets and refresh it whenever the
// organization changes (department/division create, update, delete).
let departmentCodesSyncCache: string[] = [];
let activeDepartmentCodesSyncCache: string[] = [];
// Case-insensitive membership (codes are stored uppercase; legacy/migrated
// records and hand-built requests may carry mixed case).
const inCodeCache = (code: string) => departmentCodesSyncCache.includes(String(code).toUpperCase());
const inActiveCodeCache = (code: string) => activeDepartmentCodesSyncCache.includes(String(code).toUpperCase());
async function refreshDepartmentCodesCache() {
  departmentCodesSyncCache = await departmentCodes(false);
  activeDepartmentCodesSyncCache = await departmentCodes(true);
}
function bangkokYearMonth(date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" })
    .formatToParts(date);
  return { year: parts.find((part) => part.type === "year")?.value, month: parts.find((part) => part.type === "month")?.value };
}
// Preload the department code cache so safeRepair works before any request.
await refreshDepartmentCodesCache();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // CORS preflight (cross-origin GitHub Pages -> Render API).
    if (request.method === "OPTIONS") {
      const origin = request.headers.origin;
      response.writeHead(204, {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      });
      response.end();
      return;
    }

    if (request.method === "GET" && pathname === "/api/health") return json(request, response, 200, { ok: true });

    if (pathname.startsWith("/api/")) {
      if (["POST", "PUT", "DELETE"].includes(request.method)) {
        const origin = request.headers.origin;
        if (origin && !originAllowed(origin)) return json(request, response, 403, { error: "คำขอจากแหล่งที่ไม่อนุญาต" });
      }
      if (request.method === "POST" && pathname === "/api/login") {
        const client = request.socket.remoteAddress || "unknown";
        const attempt = loginAttempts.get(client) || { count: 0, resetAt: Date.now() + 15 * 60_000 };
        if (attempt.resetAt <= Date.now()) { attempt.count = 0; attempt.resetAt = Date.now() + 15 * 60_000; }
        if (attempt.count >= 10) return json(request, response, 429, { error: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที" });
        const body = await readBody(request);
        const row = await q1("SELECT * FROM users WHERE user_id = $1 AND active = TRUE", [String(body.userId || "")]);
        if (!row || !(await passwordMatches(String(body.password || ""), row.password_hash))) {
          attempt.count += 1;
          loginAttempts.set(client, attempt);
          return json(request, response, 401, { error: "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }
        loginAttempts.delete(client);
        const now = Date.now();
        await pool.query("DELETE FROM sessions WHERE expires_at <= $1", [now]);
        const activeUserCount = await qCount(`SELECT COUNT(DISTINCT user_id) AS count FROM sessions
          WHERE expires_at > $1`, [now]);
        const alreadyActive = await q1(`SELECT 1 FROM sessions WHERE user_id = $1
          AND expires_at > $2 LIMIT 1`, [row.user_id, now]);
        if (!alreadyActive && activeUserCount >= maxConcurrentUsers) {
          return json(request, response, 429, { error: `ขณะนี้มีผู้ใช้งานครบ ${maxConcurrentUsers} User แล้ว กรุณาลองเข้าสู่ระบบอีกครั้งภายหลัง` });
        }
        const token = randomBytes(32).toString("base64url");
        const expires = now + sessionDays * 86400_000;
        await pool.query("INSERT INTO sessions (token_hash, user_id, expires_at, last_activity_at) VALUES ($1, $2, $3, $4)", [hashToken(token), row.user_id, expires, now]);
        return json(request, response, 200, { user: await clientVisibleUser(userFromRow(row)) }, { "Set-Cookie": cookie(token, sessionDays * 86400) });
      }
      if (request.method === "POST" && pathname === "/api/logout") {
        const token = parseCookies(request.headers.cookie)[cookieName];
        if (token) await pool.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
        return json(request, response, 200, { ok: true }, { "Set-Cookie": cookie("", 0) });
      }

      const user = await authenticate(request);
      if (!user) {
        const hadSessionCookie = Boolean(parseCookies(request.headers.cookie)[cookieName]);
        return json(request, response, 401, {
          error: "กรุณาเข้าสู่ระบบใหม่",
          sessionExpired: hadSessionCookie,
        });
      }
      if (request.method === "GET" && pathname === "/api/announcements") {
        const announcements = await q("SELECT id, created_by AS \"createdBy\", created_at AS \"createdAt\" FROM announcements ORDER BY created_at DESC, id DESC");
        return json(request, response, 200, { announcements });
      }
      const announcementImageRoute = pathname.match(/^\/api\/announcements\/([^/]+)\/image$/);
      if (request.method === "GET" && announcementImageRoute) {
        const announcementId = decodeURIComponent(announcementImageRoute[1]);
        const announcement = await q1("SELECT image_data FROM announcements WHERE id = $1", [announcementId]);
        if (!announcement) return json(request, response, 404, { error: "ไม่พบป้ายประกาศนี้" });
        return json(request, response, 200, { imageData: announcement.image_data }, { "Cache-Control": "private, max-age=86400" });
      }
      if (request.method === "POST" && pathname === "/api/announcements") {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้นที่เพิ่มประกาศได้" });
        const body = await readBody(request);
        const imageData = String(body.imageData || "");
        const imageMatch = imageData.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
        if (!imageMatch) return json(request, response, 400, { error: "รองรับเฉพาะรูปภาพ JPG, PNG หรือ WebP" });
        if (Buffer.byteLength(imageData, "utf8") > 8_500_000 || Buffer.from(imageMatch[2], "base64").length === 0) {
          return json(request, response, 413, { error: "ไฟล์ภาพใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดเล็กลง" });
        }
        const announcement = {
          id: randomBytes(12).toString("hex"),
          imageData,
          createdBy: user.userId,
          createdAt: new Date().toISOString(),
        };
        await pool.query("INSERT INTO announcements (id, image_data, created_by, created_at) VALUES ($1, $2, $3, $4)", [announcement.id, announcement.imageData, announcement.createdBy, announcement.createdAt]);
        await recordAdminAudit(user.userId, "เพิ่มป้ายประกาศ", "ประกาศ", announcement.id, "เพิ่มรูปภาพประกาศที่หน้าเลือกฝ่าย");
        return json(request, response, 201, { announcement });
      }
      if (request.method === "DELETE" && pathname.startsWith("/api/announcements/")) {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้นที่ลบประกาศได้" });
        const announcementId = decodeURIComponent(pathname.slice("/api/announcements/".length));
        const removed = await pool.query("DELETE FROM announcements WHERE id = $1", [announcementId]);
        if (!removed.rowCount) return json(request, response, 404, { error: "ไม่พบประกาศนี้" });
        await recordAdminAudit(user.userId, "ลบป้ายประกาศ", "ประกาศ", announcementId, "ลบรูปภาพประกาศจากหน้าเลือกฝ่าย");
        return json(request, response, 200, { ok: true });
      }
      if (request.method === "GET" && pathname === "/api/session") {
        const token = parseCookies(request.headers.cookie)[cookieName];
        const expires = Date.now() + sessionDays * 86400_000;
        await pool.query("UPDATE sessions SET expires_at = $1 WHERE token_hash = $2", [expires, hashToken(token)]);
        return json(request, response, 200, { user: await clientVisibleUser(user) }, { "Set-Cookie": cookie(token, sessionDays * 86400) });
      }
      if (request.method === "POST" && pathname === "/api/activity") {
        const token = parseCookies(request.headers.cookie)[cookieName];
        const now = Date.now();
        const expires = now + sessionDays * 86400_000;
        await pool.query("UPDATE sessions SET last_activity_at = $1, expires_at = $2 WHERE token_hash = $3", [now, expires, hashToken(token)]);
        return json(request, response, 200, { ok: true }, { "Set-Cookie": cookie(token, sessionDays * 86400) });
      }
      if (request.method === "POST" && pathname === "/api/presence") {
        const token = parseCookies(request.headers.cookie)[cookieName];
        const tokenHash = hashToken(token);
        await pool.query(`INSERT INTO presence (token_hash, last_seen_at) VALUES ($1, $2)
          ON CONFLICT(token_hash) DO UPDATE SET last_seen_at = excluded.last_seen_at`, [tokenHash, Date.now()]);
        return json(request, response, 200, { ok: true });
      }
      if (request.method === "GET" && pathname === "/api/admin/online-users") {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const onlineUsers = (await q(`SELECT users.user_id AS "userId", users.name,
          MAX(presence.last_seen_at) AS "lastSeenAt"
          FROM presence JOIN sessions ON sessions.token_hash = presence.token_hash
          JOIN users ON users.user_id = sessions.user_id
          WHERE users.active = TRUE AND sessions.expires_at > $1 AND presence.last_seen_at >= $2
          GROUP BY users.user_id, users.name ORDER BY users.name`, [Date.now(), Date.now() - 45_000]))
          .map((row) => ({ ...row, lastSeenAt: Number(row.lastSeenAt) }));
        return json(request, response, 200, { onlineUsers });
      }
      if (request.method === "POST" && pathname === "/api/admin/backup") {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const result = await createDatabaseBackup({ force: true });
        return json(request, response, 200, { ok: true, backup: result });
      }
      if (request.method === "GET" && pathname === "/api/admin/recovery") {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const deletedUsers = (await q("SELECT * FROM users WHERE active = FALSE ORDER BY user_id")).map(userFromRow);
        const deletedRepairs = (await q("SELECT (data_json::jsonb - 'images')::text AS data_json, deleted_at, deleted_by FROM repairs WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 200"))
          .map((row) => ({ ...JSON.parse(row.data_json), deletedAt: row.deleted_at, deletedBy: row.deleted_by }));
        const adminAuditLogs = await q("SELECT id, actor, action, target_type AS \"targetType\", target_id AS \"targetId\", details, occurred_at AS \"occurredAt\" FROM admin_audit_logs ORDER BY id DESC LIMIT 100");
        return json(request, response, 200, { deletedUsers, deletedRepairs, adminAuditLogs });
      }
      if (request.method === "POST" && pathname.startsWith("/api/admin/recovery/")) {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const match = pathname.match(/^\/api\/admin\/recovery\/(user|repair)\/(.+)$/);
        if (!match) return json(request, response, 404, { error: "ไม่พบรายการที่ต้องการกู้คืน" });
        const [, type, encodedId] = match;
        const targetId = decodeURIComponent(encodedId);
        let updated;
        if (type === "user") {
          updated = await pool.query("UPDATE users SET active = TRUE WHERE user_id = $1 AND active = FALSE", [targetId]);
          if (updated.rowCount) await recordAdminAudit(user.userId, "กู้คืนผู้ใช้", "ผู้ใช้", targetId, "เปิดใช้งานบัญชีอีกครั้ง");
        } else {
          updated = await pool.query("UPDATE repairs SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL", [targetId]);
          if (updated.rowCount) await recordAdminAudit(user.userId, "กู้คืนงาน", "งานแจ้งซ่อม", targetId, "กู้คืนงานและคงประวัติการดำเนินงานเดิม");
        }
        if (!updated.rowCount) return json(request, response, 404, { error: "ไม่พบรายการที่ถูกลบหรือรายการนี้ถูกกู้คืนแล้ว" });
        return json(request, response, 200, { ok: true });
      }
      if (request.method === "POST" && pathname === "/api/change-password") {
        const body = await readBody(request);
        const oldPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");
        if (newPassword.length < 6) return json(request, response, 400, { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
        const row = await q1("SELECT password_hash FROM users WHERE user_id = $1", [user.userId]);
        if (!row || !(await passwordMatches(oldPassword, row.password_hash))) return json(request, response, 403, { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
        if (await passwordMatches(newPassword, row.password_hash)) return json(request, response, 400, { error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม" });
        const token = parseCookies(request.headers.cookie)[cookieName];
        await pool.query("UPDATE users SET password_hash = $1 WHERE user_id = $2", [await passwordHash(newPassword), user.userId]);
        await pool.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash != $2", [user.userId, hashToken(token)]);
        return json(request, response, 200, { ok: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
      }

            if (request.method === "GET" && pathname === "/api/data") {
              // Read the version before the data: if something changes mid-request the
              // client keeps the older version and simply fetches again next time.
              const dataVersion = await currentDataVersion();
              if (url.searchParams.get("since") === dataVersion) return json(request, response, 200, { unchanged: true, dataVersion });
              const activeDepartmentCodeSet = isAdmin(user) ? await departmentCodes() : await departmentCodes(true);
              const activeUserDepartments = isAdmin(user)
                ? activeDepartmentCodeSet
                : user.departments.filter((code) => activeDepartmentCodeSet.includes(code));
        const deptParams: (string | null)[] = activeUserDepartments.length ? activeUserDepartments : [null];
        const deptIn = inPlaceholders(deptParams.length);
        const rows = isAdmin(user)
          ? await q("SELECT (data_json::jsonb - 'images')::text AS data_json FROM repairs WHERE deleted_at IS NULL")
          : await q(`SELECT (data_json::jsonb - 'images')::text AS data_json FROM repairs WHERE deleted_at IS NULL AND department IN (${deptIn})`, deptParams);
        const logs = isAdmin(user)
          ? await q("SELECT data_json FROM audit_logs")
          : await q(`SELECT data_json FROM audit_logs WHERE department IN (${deptIn})`, deptParams);
        const users = isAdmin(user) ? (await q("SELECT * FROM users WHERE active = TRUE ORDER BY user_id")).map(userFromRow) : [];
        const controls = isAdmin(user)
          ? await q("SELECT * FROM department_controls ORDER BY department")
          : await q(`SELECT * FROM department_controls WHERE department IN (${deptIn})`, deptParams);
        const departmentControls = controls.map((row) => ({ department: row.department, status: row.status, updatedBy: row.updated_by, updatedAt: row.updated_at }));
        const controlHistoryRows = isAdmin(user)
          ? await q("SELECT * FROM department_control_history ORDER BY id DESC LIMIT 100")
          : await q(`SELECT * FROM department_control_history WHERE department IN (${deptIn}) ORDER BY id DESC LIMIT 100`, deptParams);
        const departmentControlHistory = controlHistoryRows.map((row) => ({ id: row.id, department: row.department, status: row.status, reason: row.reason, updatedBy: row.updated_by, updatedAt: row.updated_at }));
        const adminAuditLogs = isAdmin(user)
          ? await q("SELECT id, actor, action, target_type AS \"targetType\", target_id AS \"targetId\", details, occurred_at AS \"occurredAt\" FROM admin_audit_logs ORDER BY id DESC LIMIT 100")
          : [];
        const [allDivisions, allDepartments] = await Promise.all([getDivisionRecords(), getDepartmentRecords()]);
        const visibleDivisions = isAdmin(user) ? allDivisions : allDivisions.filter((item) => item.active && user.divisions.includes(item.code));
        const visibleDepartments = isAdmin(user) ? allDepartments : allDepartments.filter((item) => item.effectiveActive && user.departments.includes(item.code));
        const visibleUser = await clientVisibleUser(user);
        return json(request, response, 200, { dataVersion, user: visibleUser, users, repairs: await withRequesterNames(rows.map((row) => JSON.parse(row.data_json))), auditLogs: logs.map((row) => JSON.parse(row.data_json)), departmentControls, departmentControlHistory, adminAuditLogs, divisions: visibleDivisions, departments: visibleDepartments });
      }
      const repairImagesRoute = pathname.match(/^\/api\/repairs\/([^/]+)\/images$/);
      if (request.method === "GET" && repairImagesRoute) {
        const repairId = decodeURIComponent(repairImagesRoute[1]);
        const row = await q1("SELECT department, COALESCE((data_json::jsonb->'images')::text, '[]') AS images FROM repairs WHERE id = $1 AND deleted_at IS NULL", [repairId]);
        if (!row) return json(request, response, 404, { error: "ไม่พบงานแจ้งซ่อม" });
        const department = String(row.department || "").toLowerCase();
        const userDepartmentCodes = user.departments.map((code) => String(code).toLowerCase());
        const activeDepartmentCodes = (await departmentCodes(true)).map((code) => String(code).toLowerCase());
        if (!isAdmin(user) && (!userDepartmentCodes.includes(department) || !activeDepartmentCodes.includes(department))) {
          return json(request, response, 403, { error: "ไม่มีสิทธิ์ดูรูปภาพของงานนี้" });
        }
        // Photos never change after a repair is created (PUT /api/repairs keeps the
        // stored ones), so the browser may reuse them instead of downloading again.
        return json(request, response, 200, { images: JSON.parse(row.images || "[]") }, { "Cache-Control": "private, max-age=86400" });
      }
      if (request.method === "PUT" && pathname.startsWith("/api/department-controls/")) {
        const department = decodeURIComponent(pathname.slice("/api/department-controls/".length));
        if (!(await departmentCodes(true)).includes(department)) return json(request, response, 404, { error: "ไม่พบแผนกนี้ หรือแผนกถูกปิดใช้งาน" });
        if (!isAdmin(user) && !user.departments.includes(department)) return json(request, response, 403, { error: "ไม่มีสิทธิ์ในแผนกนี้" });
        if (!hasRole(user, "production-control")) return json(request, response, 403, { error: "ไม่มีสิทธิ์เปลี่ยนสถานะ START/STOP" });
        const body = await readBody(request);
        if (!["start", "stop"].includes(body.status)) return json(request, response, 400, { error: "สถานะต้องเป็น START หรือ STOP" });
        const reason = String(body.reason || "").trim();
        if (body.status === "stop" && !reason) return json(request, response, 400, { error: "กรุณาระบุเหตุผลก่อนกด STOP" });
        if (reason.length > 500) return json(request, response, 400, { error: "เหตุผลต้องไม่เกิน 500 ตัวอักษร" });
        const updatedAt = new Date().toISOString();
        const result = await withTransaction(async (client) => {
          await client.query(`INSERT INTO department_controls (department, status, updated_by, updated_at) VALUES ($1, $2, $3, $4)
            ON CONFLICT(department) DO UPDATE SET status = excluded.status, updated_by = excluded.updated_by, updated_at = excluded.updated_at`, [department, body.status, user.userId, updatedAt]);
          const historyResult = await client.query("INSERT INTO department_control_history (department, status, reason, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id", [department, body.status, reason, user.userId, updatedAt]);
          return historyResult.rows[0];
        });
        return json(request, response, 200, {
          control: { department, status: body.status, updatedBy: user.userId, updatedAt },
          historyItem: { id: Number(result.id), department, status: body.status, reason, updatedBy: user.userId, updatedAt },
        });
      }
      if (request.method === "POST" && pathname === "/api/migrate-local") {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const body = await readBody(request);
        if (await qCount("SELECT COUNT(*) AS count FROM repairs") > 0) return json(request, response, 409, { error: "ฐานข้อมูลมีข้อมูลงานซ่อมแล้ว" });
        const importedRepairs = Array.isArray(body.repairs) ? body.repairs.filter(safeRepair) : [];
        const departmentByRepair = new Map(importedRepairs.map((repair) => [repair.id, repair.department]));
        const importedLogs = Array.isArray(body.auditLogs) ? body.auditLogs : [];
        await withTransaction(async (client) => {
          for (const repair of importedRepairs) await client.query("INSERT INTO repairs (id, department, data_json) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [repair.id, repair.department, JSON.stringify(repair)]);
          for (const log of importedLogs) {
            const department = departmentByRepair.get(log.repairId);
            if (department) await client.query("INSERT INTO audit_logs (id, repair_id, department, data_json) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING", [String(log.id), String(log.repairId), department, JSON.stringify({ ...log, department })]);
          }
        });
        return json(request, response, 200, { importedRepairs: importedRepairs.length, importedLogs: importedLogs.length });
      }
      if (request.method === "DELETE" && pathname.startsWith("/api/divisions/")) {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const code = decodeURIComponent(pathname.slice("/api/divisions/".length));
        const division = (await getDivisionRecords()).find((item) => item.code.toLowerCase() === code.toLowerCase());
        if (!division) return json(request, response, 404, { error: "ไม่พบฝ่ายนี้" });
        const departmentCount = await qCount("SELECT COUNT(*) AS count FROM departments WHERE division_code = $1", [division.code]);
        if (departmentCount) return json(request, response, 409, { error: "ฝ่ายนี้ยังมีแผนกอยู่ ให้ปิดใช้งานฝ่ายแทนการลบ" });
        const assignedUser = (await q("SELECT user_id, divisions_json, roles_json FROM users WHERE active = TRUE")).some((row) => !JSON.parse(row.roles_json).includes("admin") && JSON.parse(row.divisions_json || "[]").includes(division.code));
        if (assignedUser) return json(request, response, 409, { error: "ยังมีผู้ใช้ที่ได้รับสิทธิ์ฝ่ายนี้ กรุณาปรับสิทธิ์ก่อนลบ" });
        await pool.query("DELETE FROM divisions WHERE code = $1", [division.code]);
        await recordAdminAudit(user.userId, "ลบฝ่าย", "ฝ่าย", division.code, `ลบฝ่าย ${division.name} ที่ไม่มีแผนกหรือผู้ใช้งาน`);
        return json(request, response, 200, { ok: true });
      }
      if (request.method === "POST" && pathname === "/api/divisions") {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const body = await readBody(request);
        const code = String(body.code || "").trim().toUpperCase();
        const name = String(body.name || "").trim();
        if (!/^[A-Z0-9_-]{2,16}$/.test(code) || !name || name.length > 80) return json(request, response, 400, { error: "กรอกรหัสฝ่าย 2–16 ตัว และชื่อฝ่ายไม่เกิน 80 ตัวอักษร" });
        try { await pool.query("INSERT INTO divisions (code, name, active) VALUES ($1, $2, TRUE)", [code, name]); }
        catch (error) { if (String(error).includes("duplicate key") || (error as any)?.code === "23505") return json(request, response, 409, { error: "รหัสฝ่ายนี้มีอยู่แล้ว" }); throw error; }
        await recordAdminAudit(user.userId, "เพิ่มฝ่าย", "ฝ่าย", code, `เพิ่มฝ่าย ${name}`);
        return json(request, response, 201, { division: (await getDivisionRecords()).find((item) => item.code === code) });
      }
      if (request.method === "PUT" && pathname.startsWith("/api/divisions/")) {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const code = decodeURIComponent(pathname.slice("/api/divisions/".length));
        const body = await readBody(request);
        const current = (await getDivisionRecords()).find((item) => item.code.toLowerCase() === code.toLowerCase());
        if (!current) return json(request, response, 404, { error: "ไม่พบฝ่ายนี้" });
        const name = body.name === undefined ? current.name : String(body.name || "").trim();
        const active = body.active === undefined ? current.active : body.active === true;
        if (!name || name.length > 80) return json(request, response, 400, { error: "ชื่อฝ่ายต้องมีความยาว 1–80 ตัวอักษร" });
        await pool.query("UPDATE divisions SET name = $1, active = $2 WHERE code = $3", [name, active, current.code]);
        await recordAdminAudit(user.userId, active === current.active && name !== current.name ? "แก้ไขฝ่าย" : active ? "เปิดใช้งานฝ่าย" : "ปิดใช้งานฝ่าย", "ฝ่าย", current.code, `${current.name} → ${name}; ${active ? "เปิดใช้งาน" : "ปิดใช้งาน"}`);
        return json(request, response, 200, { division: (await getDivisionRecords()).find((item) => item.code === current.code) });
      }
      if (request.method === "POST" && pathname === "/api/departments") {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const body = await readBody(request);
        const code = String(body.code || "").trim().toUpperCase();
        const name = String(body.name || "").trim();
        const divisionCode = String(body.divisionCode || "").trim().toUpperCase();
        if (!/^[A-Z0-9_-]{1,20}$/.test(code) || !name || name.length > 80 || !(await divisionCodes(true)).includes(divisionCode)) return json(request, response, 400, { error: "กรอกรหัสและชื่อแผนก พร้อมเลือกฝ่ายที่เปิดใช้งาน" });
        try { await pool.query("INSERT INTO departments (code, name, division_code, active) VALUES ($1, $2, $3, TRUE)", [code, name, divisionCode]); }
        catch (error) { if (String(error).includes("duplicate key") || (error as any)?.code === "23505") return json(request, response, 409, { error: "รหัสแผนกนี้มีอยู่แล้ว" }); throw error; }
        await recordAdminAudit(user.userId, "เพิ่มแผนก", "แผนก", code, `เพิ่มแผนก ${name} ในฝ่าย ${divisionCode}`);
        await refreshDepartmentCodesCache();
        return json(request, response, 201, { department: (await getDepartmentRecords()).find((item) => item.code === code) });
      }
      if (request.method === "PUT" && pathname.startsWith("/api/departments/")) {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const code = decodeURIComponent(pathname.slice("/api/departments/".length));
        const body = await readBody(request);
        const current = (await getDepartmentRecords()).find((item) => item.code.toLowerCase() === code.toLowerCase());
        if (!current) return json(request, response, 404, { error: "ไม่พบแผนกนี้" });
        const name = body.name === undefined ? current.name : String(body.name || "").trim();
        const divisionCode = body.divisionCode === undefined ? current.divisionCode : String(body.divisionCode || "").trim().toUpperCase();
        const active = body.active === undefined ? current.active : body.active === true;
        if (!name || name.length > 80 || !(await divisionCodes(true)).includes(divisionCode)) return json(request, response, 400, { error: "ชื่อแผนกไม่ถูกต้อง หรือเลือกฝ่ายที่ยังไม่เปิดใช้งาน" });
        await pool.query("UPDATE departments SET name = $1, division_code = $2, active = $3 WHERE code = $4", [name, divisionCode, active, current.code]);
        if (divisionCode !== current.divisionCode) {
          const targets = await q("SELECT user_id, departments_json, divisions_json, roles_json FROM users");
          for (const target of targets) {
            if (JSON.parse(target.roles_json).includes("admin")) continue;
            const assignedDepartments = JSON.parse(target.departments_json);
            if (!assignedDepartments.includes(current.code)) continue;
            const derivedDivisions = [...new Set(assignedDepartments.map(departmentDivisionCode).filter(Boolean))] as any;
            const resolved = await Promise.all(derivedDivisions.map((d) => d ? departmentDivisionCode(d) : Promise.resolve(null)));
            await pool.query("UPDATE users SET divisions_json = $1 WHERE user_id = $2", [JSON.stringify(resolved.filter(Boolean)), target.user_id]);
          }
        }
        await refreshDepartmentCodesCache();
        await recordAdminAudit(user.userId, "แก้ไขแผนก", "แผนก", current.code, `${current.name} → ${name}; ฝ่าย ${current.divisionCode} → ${divisionCode}; ${active ? "เปิดใช้งาน" : "ปิดใช้งาน"}`);
        return json(request, response, 200, { department: (await getDepartmentRecords()).find((item) => item.code === current.code) });
      }
      if (request.method === "DELETE" && pathname.startsWith("/api/departments/")) {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const code = decodeURIComponent(pathname.slice("/api/departments/".length));
        const department = (await getDepartmentRecords()).find((item) => item.code.toLowerCase() === code.toLowerCase());
        if (!department) return json(request, response, 404, { error: "ไม่พบแผนกนี้" });
        const repairCount = await qCount("SELECT COUNT(*) AS count FROM repairs WHERE department = $1", [department.code]);
        const hasOperationalHistory = await q1("SELECT 1 FROM audit_logs WHERE department = $1 LIMIT 1", [department.code])
          || await q1("SELECT 1 FROM department_control_history WHERE department = $1 LIMIT 1", [department.code])
          || await q1("SELECT 1 FROM department_controls WHERE department = $1 LIMIT 1", [department.code]);
        const assignedUser = (await q("SELECT user_id, departments_json FROM users WHERE active = TRUE")).some((row) => JSON.parse(row.departments_json || "[]").includes(department.code));
        if (repairCount || hasOperationalHistory) return json(request, response, 409, { error: "แผนกนี้มีประวัติงานแล้ว ให้ปิดใช้งานแทนการลบ เพื่อเก็บประวัติและ PDF เดิม" });
        if (assignedUser) return json(request, response, 409, { error: "ยังมีผู้ใช้ที่ได้รับสิทธิ์แผนกนี้ กรุณาปรับสิทธิ์ก่อนลบ" });
        await pool.query("DELETE FROM departments WHERE code = $1", [department.code]);
        await refreshDepartmentCodesCache();
        await recordAdminAudit(user.userId, "ลบแผนก", "แผนก", department.code, `ลบแผนก ${department.name} ที่ไม่มีประวัติหรือผู้ใช้งาน`);
        return json(request, response, 200, { ok: true });
      }
      if (request.method === "POST" && pathname === "/api/users") {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const body = await readBody(request);
        const id = String(body.userId || "").trim();
        const name = String(body.name || "").trim();
        const password = String(body.password || "");
        const roles = Array.isArray(body.roles) ? body.roles.filter((role) => ["admin", "user", "technician", "approver", "manager", "inspector", "production-control"].includes(role)) : [];
        const activeDivisionSet = await divisionCodes(true);
        const activeDepartmentSet = await departmentCodes(true);
        const userDivisions = Array.isArray(body.divisions) ? [...new Set(body.divisions.filter((item) => activeDivisionSet.includes(item)))] : [];
        const userDepartments = Array.isArray(body.departments) ? [...new Set(body.departments.filter((item) => activeDepartmentSet.includes(item)))] : [];
        const repairUnits = roles.includes("technician") && Array.isArray(body.repairUnits) ? [...new Set(body.repairUnits.filter((unit) => repairUnitCodes.includes(unit)))] : [];
        const departmentDivisions = await Promise.all(userDepartments.map((department) => departmentDivisionCode(department)));
        const departmentAccessInvalid = userDepartments.some((department, index) => !userDivisions.includes(departmentDivisions[index]));
        if (!id || id.length > 64 || !name || password.length < 6 || !roles.length || !userDivisions.length || (userDivisions.length > 0 && !userDepartments.length) || departmentAccessInvalid || (roles.includes("technician") && !repairUnits.length)) return json(request, response, 400, { error: "กรอกข้อมูลให้ครบ เลือกหน่วยงานซ่อมสำหรับช่าง และตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร" });
        try {
          await pool.query("INSERT INTO users (user_id, name, password_hash, roles_json, departments_json, divisions_json, repair_units_json) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [id, name, await passwordHash(password), JSON.stringify(roles), JSON.stringify(userDepartments), JSON.stringify(userDivisions), JSON.stringify(repairUnits)]);
        } catch (error) {
          if (String(error).includes("duplicate key") || (error as any)?.code === "23505") return json(request, response, 409, { error: "รหัสผู้ใช้นี้มีอยู่แล้ว" });
          throw error;
        }
        await recordAdminAudit(user.userId, "เพิ่มผู้ใช้", "ผู้ใช้", id, `กำหนดบทบาท ${roles.join(", ")} ฝ่าย ${userDivisions.join(", ")} แผนก ${userDepartments.join(", ")}`);
        return json(request, response, 201, { user: userFromRow(await q1("SELECT * FROM users WHERE user_id = $1", [id])) });
      }
      if (request.method === "PUT" && pathname.startsWith("/api/users/")) {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const targetId = decodeURIComponent(pathname.slice("/api/users/".length));
        const body = await readBody(request);
        const target = await q1("SELECT * FROM users WHERE user_id = $1 AND active = TRUE", [targetId]);
        if (!target) return json(request, response, 404, { error: "ไม่พบผู้ใช้ที่ต้องการแก้ไข" });
        const previousDivisions = target.divisions_json ? JSON.parse(target.divisions_json) : ["RM"];
        const previousDepartments = JSON.parse(target.departments_json || "[]");
        const previousRoles = JSON.parse(target.roles_json || "[]");
        const previousRepairUnits = target.repair_units_json ? JSON.parse(target.repair_units_json) : (previousRoles.includes("technician") ? [...repairUnitCodes] : []);
        const allowedRoles = ["admin", "user", "technician", "approver", "manager", "inspector", "production-control"];
        const hasPermissions = Array.isArray(body.roles) || Array.isArray(body.departments) || Array.isArray(body.divisions) || Array.isArray(body.repairUnits);
        const roles = Array.isArray(body.roles) ? [...new Set(body.roles.filter((role) => allowedRoles.includes(role)))] : previousRoles;
        const activeDivisionSet = await divisionCodes(true);
        const activeDepartmentSet = await departmentCodes(true);
        const userDivisions = Array.isArray(body.divisions) ? [...new Set(body.divisions.filter((item) => activeDivisionSet.includes(item) || previousDivisions.includes(item)))] : previousDivisions;
        const userDepartments = Array.isArray(body.departments) ? [...new Set(body.departments.filter((item) => activeDepartmentSet.includes(item) || previousDepartments.includes(item)))] : previousDepartments;
        const requestedRepairUnits = Array.isArray(body.repairUnits) ? body.repairUnits : previousRepairUnits;
        const repairUnits = roles.includes("technician") ? [...new Set(requestedRepairUnits.filter((unit) => repairUnitCodes.includes(unit)))] : [];
        const resetPassword = body.password === undefined ? "" : String(body.password);
        if (!targetId || (!hasPermissions && !resetPassword)) return json(request, response, 400, { error: "ไม่มีข้อมูลที่ต้องการบันทึก" });
        const userDepartmentDivisions = await Promise.all(userDepartments.map((department) => departmentDivisionCode(department)));
        if (hasPermissions && (!roles.length || !userDivisions.length || (userDivisions.length > 0 && !userDepartments.length) || userDepartments.some((department, index) => !userDivisions.includes(userDepartmentDivisions[index])) || (roles.includes("technician") && !repairUnits.length))) return json(request, response, 400, { error: "กรุณาเลือกบทบาท ฝ่าย แผนก และหน่วยงานซ่อมของช่างให้ครบถ้วน" });
        if (resetPassword && resetPassword.length < 6) return json(request, response, 400, { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
        if (resetPassword && target.user_id.toLowerCase() === user.userId.toLowerCase()) return json(request, response, 409, { error: "สำหรับบัญชีที่กำลังใช้งาน ให้เปลี่ยนรหัสผ่านจากหน้าโปรไฟล์" });
        const wasAdmin = JSON.parse(target.roles_json).includes("admin");
        if (hasPermissions && wasAdmin && !roles.includes("admin")) {
          const activeAdminCount = (await q("SELECT roles_json FROM users WHERE active = TRUE"))
            .filter((row) => JSON.parse(row.roles_json).includes("admin")).length;
          if (activeAdminCount <= 1) return json(request, response, 409, { error: "ต้องมีผู้ดูแลระบบอย่างน้อย 1 บัญชี" });
        }
        if (hasPermissions) {
          await pool.query("UPDATE users SET roles_json = $1, departments_json = $2, divisions_json = $3, repair_units_json = $4 WHERE user_id = $5",
            [JSON.stringify(roles), JSON.stringify(userDepartments), JSON.stringify(userDivisions), JSON.stringify(repairUnits), target.user_id]);
          const oldRoles = JSON.parse(target.roles_json);
          const oldDepartments = JSON.parse(target.departments_json);
          const oldDivisions = target.divisions_json ? JSON.parse(target.divisions_json) : ["RM"];
          const oldRepairUnits = target.repair_units_json ? JSON.parse(target.repair_units_json) : [];
          if (JSON.stringify([...oldRoles].sort()) !== JSON.stringify([...roles].sort()) || JSON.stringify([...oldDepartments].sort()) !== JSON.stringify([...userDepartments].sort()) || JSON.stringify([...oldDivisions].sort()) !== JSON.stringify([...userDivisions].sort()) || JSON.stringify([...oldRepairUnits].sort()) !== JSON.stringify([...repairUnits].sort())) {
            await recordAdminAudit(user.userId, "เปลี่ยนสิทธิ์ผู้ใช้", "ผู้ใช้", target.user_id, "บทบาท " + oldRoles.join(", ") + " → " + roles.join(", ") + "; ฝ่าย " + oldDivisions.join(", ") + " → " + userDivisions.join(", ") + "; แผนก " + oldDepartments.join(", ") + " → " + userDepartments.join(", ") + "; หน่วยงานซ่อม " + oldRepairUnits.join(", ") + " → " + repairUnits.join(", "));
          }
        }
        if (resetPassword) {
          await pool.query("UPDATE users SET password_hash = $1 WHERE user_id = $2", [await passwordHash(resetPassword), target.user_id]);
          await pool.query("DELETE FROM sessions WHERE user_id = $1", [target.user_id]);
          await recordAdminAudit(user.userId, "ตั้งรหัสผ่านใหม่", "ผู้ใช้", target.user_id, "ตั้งรหัสผ่านใหม่โดยผู้ดูแลระบบ (ไม่บันทึกรหัสผ่าน)");
        }
        return json(request, response, 200, { user: userFromRow(await q1("SELECT * FROM users WHERE user_id = $1", [target.user_id])) });
      }
      if (request.method === "DELETE" && pathname.startsWith("/api/users/")) {
        if (!isAdmin(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const targetId = decodeURIComponent(pathname.slice("/api/users/".length));
        const target = await q1("SELECT * FROM users WHERE user_id = $1 AND active = TRUE", [targetId]);
        if (!target) return json(request, response, 404, { error: "ไม่พบผู้ใช้ที่ต้องการลบ" });
        if (target.user_id.toLowerCase() === user.userId.toLowerCase()) return json(request, response, 409, { error: "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้" });
        const targetIsAdmin = JSON.parse(target.roles_json).includes("admin");
        if (targetIsAdmin) {
          const activeAdminCount = (await q("SELECT roles_json FROM users WHERE active = TRUE"))
            .filter((row) => JSON.parse(row.roles_json).includes("admin")).length;
          if (activeAdminCount <= 1) return json(request, response, 409, { error: "ต้องมีผู้ดูแลระบบอย่างน้อย 1 บัญชี" });
        }
        await pool.query("UPDATE users SET active = FALSE WHERE user_id = $1", [target.user_id]);
        await pool.query("DELETE FROM sessions WHERE user_id = $1", [target.user_id]);
        await recordAdminAudit(user.userId, "ลบผู้ใช้", "ผู้ใช้", target.user_id, "ปิดใช้งานบัญชี; สามารถกู้คืนได้จากถังรายการที่ลบ");
        return json(request, response, 200, { ok: true });
      }
      if (request.method === "DELETE" && pathname.startsWith("/api/repairs/")) {
        if (!canDeleteRepairs(user)) return json(request, response, 403, { error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
        const repairId = decodeURIComponent(pathname.slice("/api/repairs/".length));
        if (!repairId) return json(request, response, 400, { error: "ไม่พบเลขที่งาน" });
        const deletedAt = new Date().toISOString();
        const result = await pool.query("UPDATE repairs SET deleted_at = $1, deleted_by = $2 WHERE id = $3 AND deleted_at IS NULL", [deletedAt, user.userId, repairId]);
        if (!result.rowCount) return json(request, response, 404, { error: "ไม่พบงานที่ต้องการลบ" });
        const statusRow = await q1("SELECT data_json::jsonb->>'status' AS status FROM repairs WHERE id = $1", [repairId]);
        await recordAdminAudit(user.userId, "ลบงาน", "งานแจ้งซ่อม", repairId, `ย้ายงานสถานะ ${statusRow?.status || "ไม่ทราบสถานะ"} ไปยังรายการที่ลบ; เก็บประวัติเดิมไว้`);
        return json(request, response, 200, { ok: true });
      }
      if (request.method === "POST" && pathname === "/api/repairs") {
        const body = await readBody(request);
        const incoming = body.repair;
        if (incoming && typeof incoming === "object" && typeof incoming.department === "string") incoming.department = incoming.department.toUpperCase();
        if (!incoming || typeof incoming !== "object" || !(await departmentCodes(true)).includes(incoming.department.toUpperCase())) return json(request, response, 400, { error: "ข้อมูลใบแจ้งซ่อมหรือแผนกไม่ถูกต้อง" });
        if (!isAdmin(user) && !user.departments.includes(incoming.department)) return json(request, response, 403, { error: "ไม่มีสิทธิ์แจ้งซ่อมในแผนกนี้" });
        if (incoming.status !== "รออนุมัติ" || !canChangeRepair(user, null, { ...incoming, status: "รออนุมัติ" })) return json(request, response, 403, { error: "บัญชีนี้ไม่มีสิทธิ์สร้างใบแจ้งซ่อม" });
        const now = new Date();
        const { year, month } = bangkokYearMonth(now);
        const division = await departmentDivisionCode(incoming.department);
        const prefix = `${division}-${incoming.department.toUpperCase()}-${year}-${month}-`;
        const id = await withTransaction(async (client) => {
          // Only the id and createdAt are needed. Extracting createdAt inside Postgres
          // (a text match, so malformed legacy JSON can't break it) avoids pulling
          // every photo of the department out of the database on each new repair.
          const rows = await cq(client, `SELECT id, substring(data_json from '"createdAt"\\s*:\\s*"([^"]*)"') AS created_at FROM repairs WHERE department = $1`, [incoming.department]);
          let sequenceFloor = 0;
          let jobsThisMonth = 0;
          for (const row of rows) {
            if (row.id.startsWith(prefix)) {
              const value = Number(row.id.slice(prefix.length));
              if (Number.isSafeInteger(value)) sequenceFloor = Math.max(sequenceFloor, value);
            }
            const createdAt = row.created_at ? new Date(row.created_at) : null;
            if (createdAt && !Number.isNaN(createdAt.getTime())) {
              const created = bangkokYearMonth(createdAt);
              if (created.year === year && created.month === month) jobsThisMonth += 1;
            }
          }
          const sequence = Math.max(sequenceFloor, jobsThisMonth) + 1;
          const newId = `${prefix}${String(sequence).padStart(5, "0")}`;
          const repair = { ...incoming, id: newId, createdAt: now.toISOString(), requester: user.userId };
          if (!safeRepair(repair)) throw new Error("ข้อมูลใบแจ้งซ่อมไม่ถูกต้อง");
          await client.query("INSERT INTO repairs (id, department, data_json, deleted_at, deleted_by) VALUES ($1, $2, $3, NULL, NULL)", [newId, repair.department, JSON.stringify(repair)]);
          return { newId, repair };
        });
        await recordAdminAudit(user.userId, "สร้างงาน", "งานแจ้งซ่อม", id.newId, `สร้างใบแจ้งซ่อมแผนก ${id.repair.department}`);
        return json(request, response, 201, { repair: await withRequesterName(id.repair) });
      }
      if (request.method === "PUT" && pathname === "/api/repairs") {
        const body = await readBody(request);
        if (!Array.isArray(body.repairs) || body.repairs.some((repair) => !safeRepair(repair) || (!isAdmin(user) && (!inActiveCodeCache(repair.department) || !user.departments.includes(repair.department.toUpperCase()))))) return json(request, response, 403, { error: "ไม่มีสิทธิ์บันทึกข้อมูลแผนกนี้" });
        // requesterName is added by the read API for display only. Do not let
        // that derived field enter workflow comparisons or persisted JSON.
        // Photos are fixed at creation. Ignore any copy the client sends back and keep
        // the stored ones (merged in SQL below), so a workflow step never re-uploads
        // or re-reads megabytes of base64 images.
        const repairsToSave = body.repairs.map((repair) => {
          const { images: _ignoredImages, ...rest } = storedRepairFields(repair);
          return rest;
        });
        if (body.auditLogs !== undefined && !Array.isArray(body.auditLogs)) return json(request, response, 400, { error: "รูปแบบประวัติการทำงานไม่ถูกต้อง" });
        const targetRepairs = new Map(repairsToSave.map((repair) => [repair.id, repair]));
        const requestedAuditLogs = body.auditLogs || [];
        if (requestedAuditLogs.some((log) => {
          const repair = targetRepairs.get(log?.repairId);
          return !repair || !["รับงานซ่อม", "เริ่มซ่อม", "เสนอเวลาซ่อม", "ส่งตรวจงาน", "อนุมัติงาน", "ไม่อนุมัติงาน", "ตรวจงานผ่าน", "ตรวจงานไม่ผ่าน"].includes(log?.action) ||
            String(log?.details || "").length > 1000;
        })) return json(request, response, 400, { error: "ข้อมูลประวัติการทำงานไม่ครบหรือไม่ถูกต้อง" });
        for (const repair of repairsToSave) {
          const storedRow = await q1("SELECT (data_json::jsonb - 'images')::text AS data_json, deleted_at FROM repairs WHERE id = $1", [repair.id]);
          if (storedRow?.deleted_at) return json(request, response, 409, { error: `งาน ${repair.id} อยู่ในรายการที่ลบ กรุณากู้คืนก่อนแก้ไข` });
          const previous = storedRow ? JSON.parse(storedRow.data_json) : null;
          if (!previous) return json(request, response, 409, { error: "กรุณารีเฟรชหน้าเว็บเพื่อให้ระบบกำหนดเลขงานใหม่อัตโนมัติ" });
          if (!canChangeRepair(user, previous, repair)) return json(request, response, 403, { error: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการขั้นตอนงานนี้" });
        }
        const savedAuditLogs = requestedAuditLogs.map((log) => {
          const repair = targetRepairs.get(log.repairId);
          return {
            id: randomBytes(16).toString("hex"),
            repairId: repair.id,
            department: repair.department,
            action: log.action,
            details: String(log.details || "").slice(0, 1000),
            user: user.userId,
            timestamp: new Date().toISOString(),
          };
        });
        await withTransaction(async (client) => {
          for (const repair of repairsToSave) {
            const oldRow = await cq1(client, "SELECT (data_json::jsonb - 'images')::text AS data_json FROM repairs WHERE id = $1 AND deleted_at IS NULL", [repair.id]);
            const previous = oldRow ? JSON.parse(oldRow.data_json) : null;
            // Write the new fields and carry the stored photos over inside Postgres.
            await client.query(`INSERT INTO repairs (id, department, data_json, deleted_at, deleted_by) VALUES ($1, $2, $3, NULL, NULL)
              ON CONFLICT(id) DO UPDATE SET department = excluded.department,
                data_json = CASE WHEN repairs.data_json::jsonb ? 'images'
                  THEN (excluded.data_json::jsonb || jsonb_build_object('images', repairs.data_json::jsonb -> 'images'))::text
                  ELSE excluded.data_json END
              WHERE repairs.deleted_at IS NULL`, [repair.id, repair.department, JSON.stringify(repair)]);
            if (!previous) {
              await recordAdminAudit(user.userId, "สร้างงาน", "งานแจ้งซ่อม", repair.id, `สร้างใบแจ้งซ่อมแผนก ${repair.department}`, client);
            } else if (stableJson(previous) !== stableJson(repair)) {
              let action = "แก้ไขงาน";
              const fieldLabels = {
                machineName: "เครื่องจักร", problemDescription: "อาการ/ปัญหา", urgency: "ความเร่งด่วน",
                status: "สถานะ", dueTime: "กำหนดเสร็จ", proposedDuration: "ระยะเวลาซ่อม",
                repairWorkDetails: "รายละเอียดการซ่อม", repairWorkNotes: "หมายเหตุ",
                inspectedBy: "ผู้ตรวจเช็ก", inspectedAt: "เวลาตรวจเช็ก", department: "แผนก",
                approvalWorkType: "ประเภทงานที่อนุมัติ",
              };
              const changedFields = Object.keys({ ...previous, ...repair })
                .filter((key) => stableJson(previous[key]) !== stableJson(repair[key]));
              let details = `แก้ไขข้อมูล ${changedFields.map((key) => fieldLabels[key] || key).join(", ")}`;
              const previousRejectionCount = Array.isArray(previous.approvalRejections)
                ? previous.approvalRejections.length
                : previous.approvalRejectedBy ? 1 : 0;
              const nextRejectionCount = Array.isArray(repair.approvalRejections) ? repair.approvalRejections.length : previousRejectionCount;
              if (nextRejectionCount > previousRejectionCount && repair.status === "รออนุมัติ") {
                action = "ไม่อนุมัติงาน";
                const rejection = repair.approvalRejections.at(-1);
                details = `ผู้อนุมัติ ${user.userId} ไม่อนุมัติ; งานกลับสู่สถานะรออนุมัติใหม่; เหตุผล: ${rejection?.reason || "ไม่ระบุเหตุผล"}`;
              } else if (previous.status !== repair.status) {
                const transitions = {
                  "รออนุมัติ->รอรับงาน": "อนุมัติงาน",
                  "รอตรวจงาน->จบงาน": "ตรวจรับและปิดงาน",
                  "รอตรวจงาน->กำลังซ่อม": "ส่งกลับแก้ไข",
                };
                action = transitions[`${previous.status}->${repair.status}`] || "เปลี่ยนสถานะงาน";
                details = `สถานะ ${previous.status || "ไม่ระบุ"} → ${repair.status || "ไม่ระบุ"}`;
                if (previous.status === "รออนุมัติ" && repair.status === "รอรับงาน" && ["งานด่วน", "งานรอวางแผน"].includes(repair.approvalWorkType)) {
                  details += `; ประเภทงาน: ${repair.approvalWorkType}`;
                }
                if (repair.approvalRejectReason) details += `; เหตุผล: ${repair.approvalRejectReason}`;
              }
              await recordAdminAudit(user.userId, action, "งานแจ้งซ่อม", repair.id, details, client);
            }
          }
          for (const log of savedAuditLogs) {
            await client.query("INSERT INTO audit_logs (id, repair_id, department, data_json) VALUES ($1, $2, $3, $4) ON CONFLICT(id) DO UPDATE SET repair_id=excluded.repair_id, department=excluded.department, data_json=excluded.data_json",
              [log.id, log.repairId, log.department, JSON.stringify(log)]);
          }
        });
        return json(request, response, 200, { ok: true, repairs: await Promise.all(repairsToSave.map((repair) => withRequesterName(repair))), auditLogs: savedAuditLogs });
      }
      if (request.method === "PUT" && pathname === "/api/audit-logs") {
        const body = await readBody(request);
        if (!Array.isArray(body.auditLogs) || body.auditLogs.some((log) => log.department && !isAdmin(user) && (!inActiveCodeCache(log.department) || !user.departments.includes(log.department.toUpperCase())))) return json(request, response, 403, { error: "ไม่มีสิทธิ์บันทึกประวัตินี้" });
        await withTransaction(async (client) => {
          for (const log of body.auditLogs) {
            const repair = await cq1(client, "SELECT department FROM repairs WHERE id = $1", [log.repairId]);
            const department = log.department || repair?.department || null;
            if (department && !isAdmin(user) && (!inActiveCodeCache(department) || !user.departments.includes(department.toUpperCase()))) throw new Error("Department access denied");
            await client.query("INSERT INTO audit_logs (id, repair_id, department, data_json) VALUES ($1, $2, $3, $4) ON CONFLICT(id) DO UPDATE SET repair_id=excluded.repair_id, department=excluded.department, data_json=excluded.data_json",
              [String(log.id), String(log.repairId || ""), department, JSON.stringify({ ...log, department })]);
          }
        });
        return json(request, response, 200, { ok: true });
      }
      return json(request, response, 404, { error: "ไม่พบ API นี้" });
    }

    const distRoot = path.resolve(root, "dist");
    const candidate = path.resolve(distRoot, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!candidate.startsWith(path.join(root, "dist"))) return json(request, response, 404, { error: "Not found" });
    let filePath = candidate;
    try { if (!(await stat(filePath)).isFile()) filePath = path.join(root, "dist", "index.html"); }
    catch { filePath = path.join(root, "dist", "index.html"); }
    const contents = await readFile(filePath);
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };
    response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY" });
    response.end(contents);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) json(request, response, 500, { error: "ระบบขัดข้อง กรุณาลองอีกครั้ง" });
    else response.end();
  }
});

server.listen(port, host, () => console.log(`MC Maintenance server listening on ${host}:${port}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { pool.end().then(() => process.exit(0)); server.close(() => process.exit(0)); });
