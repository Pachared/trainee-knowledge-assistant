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
