import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const projectName = `tka-rag-it-${Date.now()}`;
const compose = ["compose", "--project-name", projectName, "-f", "docker-compose.rag-test.yml"];
let stackStarted = false;
let baseUrl = "";
let chromaUrl = "";
let dockerEnv = process.env;

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("could not allocate a local port"));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

function runDocker(args, options = {}) {
  const result = spawnSync("docker", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: dockerEnv
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`docker ${args.join(" ")} failed${details ? `\n${details}` : ""}`);
  }

  return result.stdout;
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  return { response, payload };
}

async function waitForHealth() {
  const deadline = Date.now() + 180_000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const { response, payload } = await request("/api/health");
      if (response.ok && payload?.ok) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(2_000);
  }

  throw new Error(`web service did not become healthy: ${lastError}`);
}

async function waitForChroma() {
  const deadline = Date.now() + 120_000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${chromaUrl}/api/v2/heartbeat`);
      if (response.ok) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(1_000);
  }

  throw new Error(`chroma did not become healthy: ${lastError}`);
}

function cookieFromLogin(response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("login did not return a session cookie");
  }
  return setCookie.split(";")[0];
}

function parseSseEvents(text) {
  return text
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const event = block
        .split("\n")
        .find((line) => line.startsWith("event:"))
        ?.replace("event:", "")
        .trim();
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace("data:", "").trim())
        .join("\n");

      return { event, data: data ? JSON.parse(data) : null };
    });
}

async function main() {
  const marker = `docker-rag-citation-${Date.now()}`;
  const filename = `${marker}.txt`;
  const [webPort, chromaPort] = await Promise.all([getFreePort(), getFreePort()]);
  baseUrl = `http://127.0.0.1:${webPort}`;
  chromaUrl = `http://127.0.0.1:${chromaPort}`;
  dockerEnv = {
    ...process.env,
    DOCKER_RAG_WEB_PORT: String(webPort),
    DOCKER_RAG_CHROMA_PORT: String(chromaPort)
  };

  runDocker([...compose, "up", "-d", "--build"]);
  stackStarted = true;

  try {
    await waitForChroma();
    await waitForHealth();

    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.MOCK_ADMIN_USERNAME || "admin",
        password: process.env.MOCK_ADMIN_PASSWORD || "admin123"
      })
    });

    if (!login.response.ok || !login.payload?.ok) {
      throw new Error(`login failed: HTTP ${login.response.status} ${JSON.stringify(login.payload)}`);
    }

    const cookie = cookieFromLogin(login.response);
    const form = new FormData();
    form.set(
      "file",
      new File(
        [
          [
            `Citation marker: ${marker}.`,
            "This TXT document is uploaded through Docker Compose with real Chroma enabled.",
            "The answer should cite this uploaded document context."
          ].join("\n")
        ],
        filename,
        { type: "text/plain" }
      )
    );

    const upload = await request("/api/upload", {
      method: "POST",
      headers: { Cookie: cookie },
      body: form
    });
    const document = upload.payload?.data?.document;

    if (upload.response.status !== 201 || !upload.payload?.ok || !document) {
      throw new Error(`upload failed: HTTP ${upload.response.status} ${JSON.stringify(upload.payload)}`);
    }

    if (document.status !== "ready") {
      throw new Error(`expected uploaded document to be ready, got ${document.status}: ${document.failedReason || ""}`);
    }

    const chat = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        documentId: document.id,
        message: `เอกสารที่มี marker ${marker} พูดถึงอะไร`
      })
    });
    const chatText = await chat.text();

    if (!chat.ok) {
      throw new Error(`chat failed: HTTP ${chat.status} ${chatText}`);
    }

    const events = parseSseEvents(chatText);
    const meta = events.find((event) => event.event === "meta")?.data;
    const done = events.find((event) => event.event === "done")?.data;
    const error = events.find((event) => event.event === "error")?.data;

    if (error) {
      throw new Error(`chat stream error: ${JSON.stringify(error)}`);
    }

    const citedUploadedDocument = meta?.citations?.some((citation) => citation.title === marker);
    if (!citedUploadedDocument) {
      throw new Error(`expected citation for ${marker}, got ${JSON.stringify(meta?.citations || [])}`);
    }

    if (!done?.message?.citedChunkIds?.length) {
      throw new Error(`expected done message with citedChunkIds, got ${JSON.stringify(done)}`);
    }

    console.log(
      JSON.stringify({
        ok: true,
        documentStatus: document.status,
        citationTitle: marker,
        citedChunkCount: done.message.citedChunkIds.length
      })
    );
  } finally {
    runDocker([...compose, "down", "-v", "--remove-orphans"]);
  }
}

main().catch((error) => {
  if (stackStarted) {
    try {
      runDocker([...compose, "logs", "--tail", "120"], { capture: false });
      runDocker([...compose, "down", "-v", "--remove-orphans"], { capture: false });
    } catch {
      // Best-effort cleanup/logging only.
    }
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
