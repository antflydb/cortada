import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "@/lib/security/rate-limit";

describe("consumeRateLimit", () => {
  it("allows requests within a fixed window and reports the remaining budget", () => {
    const store = new Map();
    expect(consumeRateLimit("client", { limit: 2, windowMs: 1_000 }, 10_000, store)).toMatchObject({
      allowed: true,
      remaining: 1,
      resetAt: 11_000,
    });
    expect(consumeRateLimit("client", { limit: 2, windowMs: 1_000 }, 10_100, store)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(consumeRateLimit("client", { limit: 2, windowMs: 1_000 }, 10_200, store)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("starts a fresh budget after the window expires", () => {
    const store = new Map();
    consumeRateLimit("client", { limit: 1, windowMs: 1_000 }, 10_000, store);
    expect(consumeRateLimit("client", { limit: 1, windowMs: 1_000 }, 11_000, store)).toMatchObject({
      allowed: true,
      remaining: 0,
      resetAt: 12_000,
    });
  });

  it("keeps client buckets independent", () => {
    const store = new Map();
    consumeRateLimit("client-a", { limit: 1, windowMs: 1_000 }, 10_000, store);
    expect(consumeRateLimit("client-b", { limit: 1, windowMs: 1_000 }, 10_100, store).allowed).toBe(true);
  });
});
