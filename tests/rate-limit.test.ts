import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter } from "@/lib/security/rate-limit";
import { getRedisRateLimitUrl } from "@/lib/security/redis-rate-limit";

describe("createMemoryRateLimiter", () => {
  it("blocks requests after the configured limit", () => {
    const limiter = createMemoryRateLimiter({ max: 2, windowMs: 1000 });

    expect(limiter.check("client-a").allowed).toBe(true);
    expect(limiter.check("client-a").allowed).toBe(true);
    expect(limiter.check("client-a").allowed).toBe(false);
  });
});

describe("getRedisRateLimitUrl", () => {
  it("prefers the dedicated rate limit Redis URL over REDIS_URL", () => {
    const previousRateLimitUrl = process.env.RATE_LIMIT_REDIS_URL;
    const previousRedisUrl = process.env.REDIS_URL;
    process.env.RATE_LIMIT_REDIS_URL = "redis://rate-limit:6379";
    process.env.REDIS_URL = "redis://general:6379";

    expect(getRedisRateLimitUrl()).toBe("redis://rate-limit:6379");

    if (previousRateLimitUrl === undefined) {
      delete process.env.RATE_LIMIT_REDIS_URL;
    } else {
      process.env.RATE_LIMIT_REDIS_URL = previousRateLimitUrl;
    }

    if (previousRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = previousRedisUrl;
    }
  });
});
