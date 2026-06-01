import net from "node:net";
import { getOptionalEnv } from "@/lib/env";
import type { RateLimitResult } from "@/lib/security/rate-limit";

type RedisCommandValue = string | number;

function encodeCommand(parts: RedisCommandValue[]) {
  return [
    `*${parts.length}`,
    ...parts.flatMap((part) => {
      const value = String(part);
      return [`$${Buffer.byteLength(value)}`, value];
    }),
    ""
  ].join("\r\n");
}

function parseIntegerResponse(response: string) {
  const match = response.match(/:([-\d]+)/);
  if (!match) {
    throw new Error(`Unexpected Redis response: ${response.slice(0, 80)}`);
  }

  return Number(match[1]);
}

function sendRedisCommand(url: string, parts: RedisCommandValue[], timeoutMs = 1_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const socket = net.createConnection({
      host: parsed.hostname,
      port: Number(parsed.port || 6379)
    });
    let response = "";
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Redis command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.on("connect", () => {
      if (parsed.password) {
        socket.write(encodeCommand(["AUTH", parsed.password]));
      }
      socket.write(encodeCommand(parts));
    });
    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
      socket.end();
    });
    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.on("end", () => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

export function getRedisRateLimitUrl() {
  return getOptionalEnv("RATE_LIMIT_REDIS_URL", getOptionalEnv("REDIS_URL"));
}

export async function checkRedisRateLimit(key: string, options: { max: number; windowMs: number }): Promise<RateLimitResult> {
  const url = getRedisRateLimitUrl();
  if (!url) {
    throw new Error("Redis rate limit URL is not configured");
  }

  const redisKey = `rate-limit:${key}`;
  const count = parseIntegerResponse(await sendRedisCommand(url, ["INCR", redisKey]));

  if (count === 1) {
    await sendRedisCommand(url, ["PEXPIRE", redisKey, options.windowMs]);
  }

  const ttl = parseIntegerResponse(await sendRedisCommand(url, ["PTTL", redisKey]));
  const resetAt = Date.now() + Math.max(ttl, 0);

  return {
    allowed: count <= options.max,
    remaining: Math.max(0, options.max - count),
    resetAt
  };
}

export async function checkRedisConnection() {
  const url = getRedisRateLimitUrl();
  if (!url) {
    return {
      configured: false,
      status: "warning" as const,
      url: null,
      message: "RATE_LIMIT_REDIS_URL is not configured; SQLite fallback is active."
    };
  }

  try {
    await sendRedisCommand(url, ["PING"]);
    const parsed = new URL(url);
    return {
      configured: true,
      status: "ok" as const,
      url: `${parsed.protocol}//${parsed.hostname}:${parsed.port || 6379}`
    };
  } catch (error) {
    return {
      configured: true,
      status: "error" as const,
      url,
      message: error instanceof Error ? error.message : "Redis diagnostics failed"
    };
  }
}
