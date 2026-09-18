import { lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

// Fixed-window counter stored in Postgres so it works across serverless instances.
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const windowStartMs = Math.floor(now / windowMs) * windowMs;

  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: new Date(windowStartMs), count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  // Occasionally prune expired windows so the table stays small.
  if (Math.random() < 0.01) {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now - 24 * 3600 * 1000)));
  }

  return {
    ok: row.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((windowStartMs + windowMs - now) / 1000)),
  };
}

// On Vercel the platform sets x-forwarded-for, so the first entry is the real client.
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function tooManyRequests(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
