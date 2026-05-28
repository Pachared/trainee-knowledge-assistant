export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getOptionalEnv(name: string, fallback = ""): string {
  return process.env[name] || fallback;
}

export function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }

  return "development-session-secret-change-me-32";
}

export function getOpenAIKeys(): string[] {
  const keys = [process.env.OPENAI_API_KEY, ...(process.env.OPENAI_API_KEYS || "").split(",")]
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
