import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

type LimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

const globalRateLimits = globalThis as typeof globalThis & {
  cortadaRateLimits?: Map<string, LimitEntry>;
};

const entries = globalRateLimits.cortadaRateLimits ?? new Map<string, LimitEntry>();
globalRateLimits.cortadaRateLimits = entries;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clientKey(request: Request, bucket: string): string {
  const forwarded = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for");
  const address = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${bucket}:${address}`).digest("hex");
}

export function consumeRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now(),
  store = entries,
): RateLimitResult {
  const current = store.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + policy.windowMs } : current;
  entry.count += 1;
  store.set(key, entry);

  if (store.size > 10_000) {
    for (const [candidate, value] of store) {
      if (value.resetAt <= now) store.delete(candidate);
    }
  }

  return {
    allowed: entry.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export function limitRequest(request: Request, bucket: "ingest" | "search"): RateLimitResult {
  const policy = bucket === "ingest"
    ? {
        limit: positiveInteger(process.env.CORTADA_INGEST_RATE_LIMIT, 5),
        windowMs: positiveInteger(process.env.CORTADA_INGEST_RATE_WINDOW_SECONDS, 600) * 1_000,
      }
    : {
        limit: positiveInteger(process.env.CORTADA_SEARCH_RATE_LIMIT, 30),
        windowMs: positiveInteger(process.env.CORTADA_SEARCH_RATE_WINDOW_SECONDS, 60) * 1_000,
      };
  return consumeRateLimit(clientKey(request, bucket), policy);
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1_000))),
  };
}

export function tooManyRequests(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000));
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        "Retry-After": String(retryAfter),
      },
    },
  );
}

