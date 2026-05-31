import { spawn } from "node:child_process";
import { closeSync, cpSync, existsSync, mkdirSync, openSync } from "node:fs";

const databasePath = process.env.E2E_DATABASE_PATH;

if (!databasePath) {
  throw new Error("E2E_DATABASE_PATH is required");
}

const databaseUrl = `file:${databasePath}`;
const children = new Set();

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: "inherit"
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? code}`));
    });
  });
}

function spawnChild(command, args, env = {}, cwd = process.cwd()) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    cwd,
    stdio: "inherit"
  });

  children.add(child);
  child.on("exit", () => children.delete(child));
  return child;
}

function stopChildren() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(143);
});

await run("npm", ["run", "build"], { DATABASE_URL: databaseUrl });
mkdirSync(".next/standalone/.next/static", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) {
  mkdirSync(".next/standalone/public", { recursive: true });
  cpSync("public", ".next/standalone/public", { recursive: true });
}
closeSync(openSync(databasePath, "a"));
await run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: databaseUrl });
await run("npm", ["run", "db:seed"], { DATABASE_URL: databaseUrl });

spawnChild("npm", ["run", "worker:documents"], {
  CHROMA_URL: "http://127.0.0.1:65535",
  DATABASE_URL: databaseUrl,
  DOCUMENT_WORKER_INTERVAL_MS: "500",
  OPENAI_API_KEY: "",
  OPENAI_API_KEYS: ""
});

const server = spawnChild("node", ["server.js"], {
  DATABASE_URL: databaseUrl,
  HOSTNAME: "127.0.0.1",
  PORT: "3100"
}, ".next/standalone");

server.on("exit", (code) => {
  stopChildren();
  process.exit(code ?? 1);
});
