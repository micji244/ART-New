// Migration test: boots embedded Postgres, boots the compiled server against
// it, runs the SQLite->Postgres migration in-process (importing
// scripts/migrate-sqlite-to-pg.mjs), then verifies the migrated data is served
// correctly via GET /api/data.
import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "node:child_process";
import path from "node:path";
import http from "node:http";

const PG_PORT = 5441;
const SRV_PORT = 3021;
const PG_DIR = path.resolve("test", "pg-mig-data");
// The password in this URL must match the embedded cluster's real password
// ("password") — it is NOT the string "***". A wrong password here produced
// 28P01 (scram auth failed) and was mistaken for an embedded-PG boot race.
const DB_URL = `postgres://postgres:password@127.0.0.1:${PG_PORT}/postgres?sslmode=disable`;
const SQLITE_PATH = path.resolve(".migdata", "db.sqlite");
const BASE = `http://127.0.0.1:${SRV_PORT}`;

function req(method, urlPath, body, cookieValue) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (cookieValue) headers["Cookie"] = `cm_session=${cookieValue}`;
    const r = http.request({ host: "127.0.0.1", port: SRV_PORT, path: urlPath, method, headers }, (res) => {
      let out = "";
      res.on("data", (d) => (out += d));
      res.on("end", () => {
        let parsed; try { parsed = JSON.parse(out); } catch { parsed = out; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

let failures = 0;
function check(name, cond, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  -- " + String(extra).slice(0, 180) : ""}`);
}

const pg = new EmbeddedPostgres({
  databaseDir: PG_DIR,
  port: PG_PORT,
  user: "postgres",
  password: "password",
  persistent: false,
  autoRehydrateSymlinks: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C", "--locale-provider=builtin"],
  onLog: (m) => { if (process.env.VERBOSE) console.log("[pg]", m); },
  onError: (m) => console.log("[pg:err]", typeof m === "string" ? m : m?.message),
});

let serverProc;
try {
  await pg.initialise();
  await pg.start();
  // Prime the cluster the same way the working smoke test does: a single
  // Client connect via createDatabase() (matches getPgClient; retries the
  // connect inside node-pg) reliably succeeds right after "ready", whereas a
  // raw Pool as the very first connection is the flaky primitive (28P01).
  await pg.createDatabase("postgres").catch(() => { /* already exists */ });
  // Belt-and-braces: retry a real Pool connection before doing real work.
  {
    const pgmod = await import("pg");
    const u = new URL(DB_URL);
    const warm = new pgmod.Pool({ host: u.hostname, port: Number(u.port), user: u.username, password: u.password, database: u.pathname.replace(/^\//, "") || "postgres", ssl: false, connectionTimeoutMillis: 4000 });
    let warmed = false;
    for (let i = 0; i < 12; i++) {
      try { await warm.query("SELECT 1"); warmed = true; break; }
      catch (e) { if (i === 11 || i === 0) console.log("warmup attempt", i, "failed:", e.code, e.message); await new Promise((r) => setTimeout(r, 800)); }
    }
    await warm.end().catch(() => {});
    if (!warmed) throw new Error("embedded postgres never became connectable (28P01 race)");
  }
  console.log("embedded postgres ready on port", PG_PORT);

  // Boot the compiled server first — it connects to the embedded PG itself
  // (proving the embedded cluster is healthy) and bootstraps the schema.
  console.log("\n--- booting server ---");
  serverProc = spawn("node", ["server-build/index.js"], {
    env: {
      ...process.env,
      DATABASE_URL: DB_URL,
      PORT: String(SRV_PORT),
      HOST: "127.0.0.1",
      DATA_DIR: path.resolve("test", "data"),
      BACKUP_DIR: path.resolve("test", "backups"),
      ADMIN_USER_ID: "admin",
      ADMIN_PASSWORD: "test-password-123",
      ALLOWED_ORIGINS: BASE,
    },
    stdio: "pipe",
  });
  let serverOut = "";
  serverProc.stdout.on("data", (d) => (serverOut += d));
  serverProc.stderr.on("data", (d) => (serverOut += d));

  const start = Date.now();
  let healthy = false;
  while (Date.now() - start < 15000) {
    try { const r = await req("GET", "/api/health", null, null); if (r.status === 200) { healthy = true; break; } } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  check("server healthy", healthy, serverOut.split("\n").slice(-3).join(" | "));

  // Run the migration in-process now (server already proved connectivity).
  console.log("\n--- running migration ---");
  const { runMigration } = await import("../scripts/migrate-sqlite-to-pg.mjs");
  const counts = await runMigration(SQLITE_PATH, DB_URL);

  // Give the migrated "admin" a known password so the login check can verify
  // the migrated users + sessions tables work end-to-end (the original hash
  // is unknown to this test).
  {
    const pgmod = await import("pg");
    const { scrypt, randomBytes } = await import("node:crypto");
    const salt = randomBytes(16).toString("hex");
    const derived = await new Promise((res, rej) =>
      scrypt("test-password-123", salt, 64, (e, d) => (e ? rej(e) : res(d)))
    );
    const hash = `scrypt:${salt}:${derived.toString("hex")}`;
    const u = new URL(DB_URL);
    const setPool = new pgmod.Pool({ host: u.hostname, port: Number(u.port), user: u.username, password: u.password, database: u.pathname.replace(/^\//, "") || "postgres", ssl: false });
    await setPool.query("UPDATE users SET password_hash = $1 WHERE user_id = $2", [hash, "admin"]);
    await setPool.end();
    console.log("admin password set for login test");
  }

  // Login as admin (migrated admin user exists) and capture the session cookie.
  const rawLogin = await new Promise((resolve, reject) => {
    const r = http.request({ host: "127.0.0.1", port: SRV_PORT, path: "/api/login", method: "POST", headers: { "Content-Type": "application/json" } }, (res) => {
      let out = "";
      res.on("data", (d) => (out += d));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, raw: out }));
    });
    r.on("error", reject);
    r.write(JSON.stringify({ userId: "admin", password: "test-password-123" }));
    r.end();
  });
  let cookie = null;
  const sc = rawLogin.headers["set-cookie"] || [];
  const scArr = Array.isArray(sc) ? sc : [sc];
  for (const c of scArr) { if (c && c.startsWith("cm_session=")) cookie = c.split(";")[0].slice("cm_session=".length); }
  let loginBody; try { loginBody = JSON.parse(rawLogin.raw); } catch { loginBody = rawLogin.raw; }
  check("admin can log in (migrated user)", rawLogin.status === 200 && Boolean(cookie), JSON.stringify(loginBody?.user ? loginBody.user.roles : loginBody).slice(0, 120));

  // Read /api/data and verify migrated rows are present.
  const data = await req("GET", "/api/data", null, cookie);
  const repairs = data.body?.repairs || [];
  const users = data.body?.users || [];
  const auditLogs = data.body?.auditLogs || [];
  const departments = data.body?.departments || [];
  const divisions = data.body?.divisions || [];
  check("GET /api/data returns migrated repairs", repairs.length > 0, "repairs=" + repairs.length);
  check("GET /api/data returns migrated users", users.length > 0, "users=" + users.length);
  check("GET /api/data returns migrated audit logs", auditLogs.length > 0, "auditLogs=" + auditLogs.length);
  check("GET /api/data returns departments", departments.length > 0, "departments=" + departments.length);
  check("GET /api/data returns divisions", divisions.length > 0, "divisions=" + divisions.length);

  // Verify a specific migrated repair id exists and its department is
  // normalized uppercase by the read boundary.
  const sampleRepair = repairs[0];
  check("migrated repair id present", Boolean(sampleRepair && sampleRepair.id), JSON.stringify({ id: sampleRepair?.id, department: sampleRepair?.department, status: sampleRepair?.status }).slice(0, 160));
  check("migrated repair department is uppercase", sampleRepair && typeof sampleRepair.department === "string" && sampleRepair.department === sampleRepair.department.toUpperCase(), sampleRepair?.department);

  const adminUser = users.find((u) => u.userId === "admin");
  check("migrated admin user present", Boolean(adminUser), JSON.stringify(adminUser ? { roles: adminUser.roles, departments: adminUser.departments.length } : null).slice(0, 140));

  // Cross-check a sample repair row count against the source DB.
  check("repairs count matches source", counts.final_repairs === counts.repairs, `pg=${counts.final_repairs} imported=${counts.repairs}`);
  check("users count matches source", counts.final_users === counts.users, `pg=${counts.final_users} imported=${counts.users}`);

  console.log(`\n===== ${failures === 0 ? "ALL PASSED" : failures + " FAILED"} =====`);
} catch (error) {
  console.error("MIGRATION TEST ERROR:", error);
  if (serverProc && serverProc.stdout) {
    const buf = serverProc.stdout._readableState?.buffer;
    if (buf && buf.length) console.error("server output:\n" + Buffer.concat(buf).toString());
  }
  failures++;
} finally {
  try { if (serverProc && !serverProc.killed) serverProc.kill("SIGTERM"); } catch {}
  try { await pg.stop(); } catch {}
}
process.exit(failures ? 1 : 0);
