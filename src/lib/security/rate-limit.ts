import { prisma } from "@/lib/db/prisma";
import { getNumberEnv } from "@/lib/env";
import { checkRedisRateLimit, getRedisRateLimitUrl } from "@/lib/security/redis-rate-limit";

type RateLimiterOptions = {
  max: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function createMemoryRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const current = buckets.get(key);

      if (!current || current.resetAt <= now) {
        const resetAt = now + options.windowMs;
        buckets.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: Math.max(0, options.max - 1), resetAt };
      }

      if (current.count >= options.max) {
        return { allowed: false, remaining: 0, resetAt: current.resetAt };
      }

      current.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, options.max - current.count),
        resetAt: current.resetAt
      };
    },
    clear() {
      buckets.clear();
    }
  };
}

export const globalRateLimiter = createMemoryRateLimiter({
  max: Number(process.env.RATE_LIMIT_MAX || 60),
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
});

export const uploadRateLimiter = createMemoryRateLimiter({
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || process.env.RATE_LIMIT_MAX || 20),
  windowMs: Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000)
});

export const chatRateLimiter = createMemoryRateLimiter({
  max: Number(process.env.CHAT_RATE_LIMIT_MAX || process.env.RATE_LIMIT_MAX || 60),
  windowMs: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000)
});

export async function checkStoredRateLimit(key: string, options: RateLimiterOptions): Promise<RateLimitResult> {
  if (getRedisRateLimitUrl()) {
    try {
      return await checkRedisRateLimit(key, options);
    } catch {
      // Keep the application usable if Redis is temporarily unavailable.
    }
  }

  const now = new Date();
  const bucket = await prisma.rateLimitBucket.findUnique({
    where: { bucketKey: key }
  });

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = new Date(now.getTime() + options.windowMs);
    await prisma.rateLimitBucket.upsert({
      where: { bucketKey: key },
      update: { count: 1, resetAt },
      create: { bucketKey: key, count: 1, resetAt }
    });

    return { allowed: true, remaining: Math.max(0, options.max - 1), resetAt: resetAt.getTime() };
  }

  if (bucket.count >= options.max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt.getTime() };
  }

  const updated = await prisma.rateLimitBucket.update({
    where: { bucketKey: key },
    data: { count: { increment: 1 } }
  });

  return {
    allowed: true,
    remaining: Math.max(0, options.max - updated.count),
    resetAt: updated.resetAt.getTime()
  };
}

export function globalRateLimitOptions(): RateLimiterOptions {
  return {
    max: getNumberEnv("RATE_LIMIT_MAX", 60),
    windowMs: getNumberEnv("RATE_LIMIT_WINDOW_MS", 60_000)
  };
}

export function uploadRateLimitOptions(): RateLimiterOptions {
  return {
    max: getNumberEnv("UPLOAD_RATE_LIMIT_MAX", getNumberEnv("RATE_LIMIT_MAX", 20)),
    windowMs: getNumberEnv("UPLOAD_RATE_LIMIT_WINDOW_MS", getNumberEnv("RATE_LIMIT_WINDOW_MS", 60_000))
  };
}

export function chatRateLimitOptions(): RateLimiterOptions {
  return {
    max: getNumberEnv("CHAT_RATE_LIMIT_MAX", getNumberEnv("RATE_LIMIT_MAX", 60)),
    windowMs: getNumberEnv("CHAT_RATE_LIMIT_WINDOW_MS", getNumberEnv("RATE_LIMIT_WINDOW_MS", 60_000))
  };
}
