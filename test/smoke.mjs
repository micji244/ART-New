// Smoke test: boots a local embedded Postgres, starts the compiled server,
// and exercises the key API endpoints end-to-end.
import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "node:child_process";
import path from "node:path";
import http from "node:http";

const PG_PORT = 5439;
const SRV_PORT = 3011;
const PG_DIR = path.resolve("test", "pg-data");
const BASE = `http://127.0.0.1:${SRV_PORT}`;
const DB_URL = `postgres://postgres:password@127.0.0.1:${PG_PORT}/postgres?sslmode=disable`;

const cookie = { value: null };
function req(method, urlPath, body, auth = true) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (auth && cookie.value) headers["Cookie"] = `cm_session=${cookie.value}`;
    const r = http.request({ host: "127.0.0.1", port: SRV_PORT, path: urlPath, method, headers }, (res) => {
      let out = "";
      res.on("data", (d) => (out += d));
      res.on("end", () => {
        const sc = res.headers["set-cookie"] || [];
        const scArr = Array.isArray(sc) ? sc : [sc];
        for (const c of scArr) { if (c && c.startsWith("cm_session=")) cookie.value = c.split(";")[0].slice("cm_session=".length); }
        let parsed;
        try { parsed = JSON.parse(out); } catch { parsed = out; }
        resolve({ status: res.statusCode, body: parsed, raw: out, headers: res.headers });
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

const results = [];
function check(name, cond, extra = "") {
  results.push({ name, pass: Boolean(cond), extra });
  const log = serverProc && serverProc._out ? serverProc._out() : "";
  const tail = log.slice(-1600).trim();
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  -- " + String(extra).slice(0, 200) : ""}`);
  if (!cond && tail) { console.log("----- server log (tail) -----"); console.log(tail); console.log("----- end server log -----"); }
}

let serverProc;
function startServer() {
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
  let out = "";
  serverProc.stdout.on("data", (d) => (out += d));
  serverProc.stderr.on("data", (d) => (out += d));
  serverProc._out = () => out;
}

async function waitServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await req("GET", "/api/health", null, false);
      if (r.status === 200) return r;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("server did not become healthy in " + timeoutMs + "ms\n" + (serverProc?._out ? serverProc._out() : ""));
}

const pg = new EmbeddedPostgres({
  databaseDir: PG_DIR,
  port: PG_PORT,
  user: "postgres",
  password: "password",
  persistent: false,
  autoRehydrateSymlinks: true,
  // Force UTF8 encoding (Windows initdb defaults to the local codepage,
  // e.g. WIN874/CP874 which cannot hold all Thai + unicode chars).
  initdbFlags: ["--encoding=UTF8", "--locale=C", "--locale-provider=builtin"],
  onLog: (m) => { if (process.env.VERBOSE) console.log("[pg]", m); },
  onError: (m) => console.log("[pg:err]", typeof m === "string" ? m : m?.message),
});

let exitCode = 0;
try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("postgres").catch(() => { /* already exists */ });
  console.log("embedded postgres ready on port", PG_PORT);

  startServer();
  const health = await waitServer();
  check("GET /api/health", health.status === 200 && health.body?.ok === true, JSON.stringify(health.body));

  // --- Login / session ---
  const login = await req("POST", "/api/login", { userId: "admin", password: "test-password-123" });
  check("POST /api/login (admin)", login.status === 200 && login.body?.user?.userId === "admin" && Boolean(cookie.value), JSON.stringify(login.body?.user));

  const badLogin = await req("POST", "/api/login", { userId: "admin", password: "wrong-password" }, false);
  check("POST /api/login (wrong password -> 401)", badLogin.status === 401, JSON.stringify(badLogin.body));

  const session = await req("GET", "/api/session");
  check("GET /api/session (authed)", session.status === 200 && session.body?.user?.userId === "admin" && Array.isArray(session.body?.user?.roles), JSON.stringify(session.body?.user?.roles));

  const data = await req("GET", "/api/data");
  check("GET /api/data (admin)", data.status === 200 && Array.isArray(data.body?.repairs) && Array.isArray(data.body?.users) && Array.isArray(data.body?.divisions) && Array.isArray(data.body?.departments),
    JSON.stringify({ repairs: data.body?.repairs?.length, users: data.body?.users?.length, divisions: data.body?.divisions?.length, departments: data.body?.departments?.length }));

  // --- Announcements ---
  const ann = await req("GET", "/api/announcements");
  check("GET /api/announcements", ann.status === 200 && Array.isArray(ann.body?.announcements), "count=" + (ann.body?.announcements?.length));

  // --- Presence / online users ---
  const pres = await req("POST", "/api/presence");
  check("POST /api/presence", pres.status === 200 && pres.body?.ok === true, JSON.stringify(pres.body));
  const online = await req("GET", "/api/admin/online-users");
  check("GET /api/admin/online-users (admin present)", online.status === 200 && Array.isArray(online.body?.onlineUsers) && online.body.onlineUsers.some((u) => u.userId === "admin"), JSON.stringify(online.body?.onlineUsers));

  // --- Backup ---
  const bak = await req("POST", "/api/admin/backup");
  check("POST /api/admin/backup", bak.status === 200 && bak.body?.ok === true, JSON.stringify(bak.body).slice(0, 140));

  // --- Recovery list ---
  const rec = await req("GET", "/api/admin/recovery");
  check("GET /api/admin/recovery", rec.status === 200 && Array.isArray(rec.body?.deletedUsers) && Array.isArray(rec.body?.adminAuditLogs), "adminAudit=" + (rec.body?.adminAuditLogs?.length));

  // --- Create a repair (POST) ---
  const create = await req("POST", "/api/repairs", { repair: { department: "Agg1", status: "รออนุมัติ", description: "ทดสอบ smoke" } });
  const newId = create.body?.repair?.id;
  // The handler uppercases the department when building the id prefix (RM-AGG1-...),
  // but the stored repair keeps the original-case department ("Agg1").
  check("POST /api/repairs (admin create)", create.status === 201 && typeof newId === "string" && newId.startsWith("RM-AGG1-"), JSON.stringify(create.body?.repair?.id));

  // --- Read it back via /api/data ---
  const data2 = await req("GET", "/api/data");
  const back = (data2.body?.repairs || []).find((r) => r.id === newId);
  check("GET /api/data returns created repair", Boolean(back) && back.department === "AGG1" && back.status === "รออนุมัติ", JSON.stringify({ id: back?.id, department: back?.department }));

  // --- Approve it (PUT with the approval transition) ---
  const nowIso = new Date().toISOString();
  const approved = await req("PUT", "/api/repairs", {
    repairs: [{ ...back, status: "รอรับงาน", approvalWorkType: "งานด่วน", approvedBy: "admin", approvedAt: nowIso }],
    auditLogs: [],
  });
  check("PUT /api/repairs (admin approve)", approved.status === 200 && approved.body?.ok === true, JSON.stringify(approved.body).slice(0, 200));
  const data3 = await req("GET", "/api/data");
  const after = (data3.body?.repairs || []).find((r) => r.id === newId);
  check("PUT persisted status -> รอรับงาน", after?.status === "รอรับงาน" && after?.approvedBy === "admin", JSON.stringify({ status: after?.status, approvedBy: after?.approvedBy }));

  // --- Division / department writes (CITEXT + audit + cache refresh) ---
  const divCreate = await req("POST", "/api/divisions", { code: "TEST", name: "Test Division" });
  check("POST /api/divisions (create TEST)", divCreate.status === 201 || divCreate.status === 200, JSON.stringify(divCreate.body).slice(0, 160));
  const depCreate = await req("POST", "/api/departments", { code: "Tst1", name: "Test Dept", divisionCode: "TEST" });
  check("POST /api/departments (create Tst1)", depCreate.status === 201 || depCreate.status === 200, JSON.stringify(depCreate.body).slice(0, 160));
  const data4 = await req("GET", "/api/data");
  check("GET /api/data shows new division+department", (data4.body?.divisions || []).some((d) => d.code === "TEST") && (data4.body?.departments || []).some((d) => d.code === "TST1"),
    "divisions=" + (data4.body?.divisions?.length) + " departments=" + (data4.body?.departments?.length));

  // --- Non-admin: second user without permission ---
  const userCreate = await req("POST", "/api/users", { userId: "tech1", name: "ช่างทดสอบ", password: "tech-password", roles: ["technician"], divisions: ["RM"], departments: ["AGG1"], repairUnits: ["Maintenance"] });
  check("POST /api/users (create tech1)", userCreate.status === 201 || userCreate.status === 200, JSON.stringify(userCreate.body).slice(0, 160));

  // tech1 logs in
  const techCookie = cookie.value;
  cookie.value = null;
  const techLogin = await req("POST", "/api/login", { userId: "tech1", password: "tech-password" }, false);
  check("POST /api/login (tech1)", techLogin.status === 200 && techLogin.body?.user?.userId === "tech1", JSON.stringify(techLogin.body?.user?.roles));
  // tech1 reads data — should see only Agg1 department
  const techData = await req("GET", "/api/data");
  check("GET /api/data (tech1 scoped)", techData.status === 200 && (techData.body?.departments || []).length === 1 && techData.body?.departments[0].code === "AGG1",
    "departments=" + JSON.stringify((techData.body?.departments || []).map((d) => d.code)));
  // tech1 cannot see other dept repairs (admin created in Agg1 so it IS visible; use admin-only check instead: user list hidden)
  const techOnline = await req("GET", "/api/admin/online-users");
  check("GET /api/admin/online-users (tech1 -> 403)", techOnline.status === 403, JSON.stringify(techOnline.body));
  // tech1 logs out
  const techLogout = await req("POST", "/api/logout");
  check("POST /api/logout (tech1)", techLogout.status === 200, JSON.stringify(techLogout.body));
  const techSession = await req("GET", "/api/session");
  check("GET /api/session after logout (401)", techSession.status === 401, JSON.stringify(techSession.body));

  // admin logs back in
  cookie.value = null;
  const reLogin = await req("POST", "/api/login", { userId: "admin", password: "test-password-123" }, false);
  check("POST /api/login (admin re-login)", reLogin.status === 200 && Boolean(cookie.value), "status=" + reLogin.status);

  // --- Logout admin ---
  const logout = await req("POST", "/api/logout");
  check("POST /api/logout (admin)", logout.status === 200, JSON.stringify(logout.body));
  const session2 = await req("GET", "/api/session");
  check("GET /api/session after logout (401)", session2.status === 401, JSON.stringify(session2.body));

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n===== ${results.length - failed}/${results.length} passed =====`);
  if (failed) exitCode = 1;
} catch (error) {
  console.error("SMOKE TEST ERROR:", error);
  if (serverProc) console.error("server output:\n", serverProc._out ? serverProc._out() : "(none)");
  exitCode = 1;
} finally {
  try { if (serverProc && !serverProc.killed) serverProc.kill("SIGTERM"); } catch {}
  try { await pg.stop(); } catch {}
}
process.exit(exitCode);
