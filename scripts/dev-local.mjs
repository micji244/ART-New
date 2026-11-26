import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pgPort = 5439;
const apiPort = 3001;
const uiPort = 5173;
const localPassword = process.env.LOCAL_ADMIN_PASSWORD || "demo12345";
const databaseDir = path.join(root, "data", "local-postgres");
const dataDir = path.join(root, "data", "local-runtime");
const databaseUrl = `postgresql://postgres:local-test-password@127.0.0.1:${pgPort}/postgres?sslmode=disable`;

const pg = new EmbeddedPostgres({
  databaseDir,
  port: pgPort,
  user: "postgres",
  password: "local-test-password",
  persistent: true,
  autoRehydrateSymlinks: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C", "--locale-provider=builtin"],
  onError: (error) => console.error("[local postgres]", error?.message || error),
});

const children = [];
let shuttingDown = false;

function startChild(command, args, options, label) {
  const child = spawn(command, args, { cwd: root, stdio: "inherit", ...options });
  children.push(child);
  child.once("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`${label} stopped (${signal || code}).`);
      void shutdown(code || 1);
    }
  });
  return child;
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) if (!child.killed) child.kill();
  try { await pg.stop(); } catch {}
  process.exit(exitCode);
}

process.once("SIGINT", () => void shutdown(0));
process.once("SIGTERM", () => void shutdown(0));

try {
  // initialise() always runs initdb, which refuses a non-empty folder. Only run
  // it the first time so the demo data really does survive between runs.
  if (!existsSync(path.join(databaseDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  await pg.createDatabase("postgres").catch(() => {});
  console.log("Local PostgreSQL is running. No Supabase connection is used.");

  startChild(process.execPath, [path.join(root, "server-build", "index.js")], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(apiPort),
      HOST: "127.0.0.1",
      DATA_DIR: dataDir,
      BACKUP_DIR: path.join(dataDir, "backups"),
      ADMIN_USER_ID: "admin",
      ADMIN_PASSWORD: localPassword,
    },
  }, "API server");

  const apiReady = await waitForApi();
  if (!apiReady) throw new Error("Local API did not start on port 3001.");

  startChild(process.execPath, [
    path.join(root, "node_modules", "vite", "bin", "vite.js"),
    "--host", "0.0.0.0", "--port", String(uiPort), "--strictPort",
  ], { env: process.env }, "Vite");

  console.log(`Open on this computer: http://127.0.0.1:${uiPort}`);
  console.log("For a phone on the same network, use the Network URL printed by Vite below.");
  console.log(`Demo login: admin / ${localPassword}`);
  console.log("Press Ctrl+C in this terminal to stop the local demo.");
} catch (error) {
  console.error("Could not start the local demo:", error?.message || error);
  await shutdown(1);
}

async function waitForApi(timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/api/health`);
      if (response.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}
