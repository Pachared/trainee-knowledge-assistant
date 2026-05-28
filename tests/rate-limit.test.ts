import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter } from "@/lib/security/rate-limit";

describe("createMemoryRateLimiter", () => {
  it("blocks requests after the configured limit", () => {
    const limiter = createMemoryRateLimiter({ max: 2, windowMs: 1000 });

    expect(limiter.check("client-a").allowed).toBe(true);
    expect(limiter.check("client-a").allowed).toBe(true);
    expect(limiter.check("client-a").allowed).toBe(false);
  });
});
