import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const containerName = "trainee-knowledge-chroma-local";
const image = "chromadb/chroma@sha256:1e0b73a187a28757c572acba508c46f48c9e8b0acaf5c20e6d95cdedce1acdf6";
const volume = "trainee-knowledge-assistant_chroma-data";
const heartbeatUrl = "http://127.0.0.1:8000/api/v2/heartbeat";

function runDocker(args, options = {}) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`docker ${args.join(" ")} failed${details ? `\n${details}` : ""}`);
  }

  return result.stdout.trim();
}

function containerId(filter) {
  return runDocker(["ps", "-aq", "--filter", `name=^/${containerName}$`, ...(filter ? ["--filter", filter] : [])], {
    capture: true
  });
}

async function waitForHeartbeat() {
  const deadline = Date.now() + 60_000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(heartbeatUrl);
      if (response.ok) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(1_000);
  }

  throw new Error(`Chroma did not become ready at ${heartbeatUrl}: ${lastError}`);
}

const runningContainer = containerId("status=running");
if (runningContainer) {
  console.log(`Chroma is already running: ${containerName}`);
  await waitForHeartbeat();
  process.exit(0);
}

const existingContainer = containerId();
if (existingContainer) {
  runDocker(["rm", containerName]);
}

runDocker(["volume", "create", volume], { capture: true });
runDocker([
  "run",
  "-d",
  "--name",
  containerName,
  "-p",
  "8000:8000",
  "-v",
  `${volume}:/chroma/chroma`,
  image
]);

await waitForHeartbeat();
console.log(`Chroma is ready at ${heartbeatUrl}`);
