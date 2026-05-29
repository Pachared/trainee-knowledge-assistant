import { readFileSync } from "node:fs";

function readSecretFile(filePath: string, name: string): string {
  try {
    return readFileSync(filePath, "utf8").trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Unable to read ${name}_FILE: ${message}`);
  }
}

export function getSecretEnv(name: string, fallback = ""): string {
  const filePath = process.env[`${name}_FILE`]?.trim();

  if (filePath) {
    return readSecretFile(filePath, name);
  }

  return process.env[name] || fallback;
}

export function getRequiredEnv(name: string): string {
  const value = getSecretEnv(name);

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getOptionalEnv(name: string, fallback = ""): string {
  return getSecretEnv(name, fallback);
}

export function getNumberEnv(name: string, fallback: number): number {
  const raw = getSecretEnv(name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getSessionSecret(): string {
  const secret = getSecretEnv("SESSION_SECRET");

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }

  return "development-session-secret-change-me-32";
}

export function getOpenAIKeys(): string[] {
  const keys = [getSecretEnv("OPENAI_API_KEY"), ...getSecretEnv("OPENAI_API_KEYS").split(",")]
    .map((key) => key?.trim())
    .filter((key): key is string => Boolean(key));

  return Array.from(new Set(keys));
}

export function getChromaConfig() {
  return {
    url: getOptionalEnv("CHROMA_URL", "http://localhost:8000"),
    collection: getOptionalEnv("CHROMA_COLLECTION", "trainee_knowledge_chunks")
  };
}

export function getCookieSecure() {
  const raw = getOptionalEnv("COOKIE_SECURE").toLowerCase();

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}
