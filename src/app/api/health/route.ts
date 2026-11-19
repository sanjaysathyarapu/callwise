import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { configStatus, type ConfigStatus } from "@/lib/config";
import { db } from "@/lib/db";
import { CHECK_TIMEOUT_MS, buildReport, runCheck, withTimeout, type HealthChecks } from "@/lib/health";
import { embedText } from "@/lib/rag/embed";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const NO_STORE = { "Cache-Control": "no-store" };

function respond(config: ConfigStatus, checks: HealthChecks) {
  const { report, httpStatus } = buildReport(config, checks);
  return NextResponse.json(report, { status: httpStatus, headers: NO_STORE });
}

// Liveness and readiness for uptime monitoring. Public, so it reports booleans and
// pass/fail only: never a value and never an error message.
//   GET /api/health          configuration present, plus a database round trip
//   GET /api/health?deep=1   also makes one real OpenAI embedding call (rate limited)
export async function GET(req: Request) {
  const config = configStatus();
  const deep = new URL(req.url).searchParams.get("deep") === "1";

  // The deep check spends an OpenAI call, so cap it per client.
  if (deep && config.db) {
    try {
      const limit = await withTimeout(rateLimit(`health:deep:${getClientIp(req)}:hour`, 10, 3600), CHECK_TIMEOUT_MS);
      if (!limit.ok) {
        const res = tooManyRequests(limit.retryAfterSeconds);
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
    } catch {
      // The rate limiter lives in the database, so failing here means the database is down.
      return respond(config, { db: "fail", openai: "skipped" });
    }
  }

  const [dbCheck, openaiCheck] = await Promise.all([
    config.db ? runCheck(() => db.execute(sql`select 1`)) : ("fail" as const),
    deep ? (config.openai ? runCheck(() => embedText("ping")) : ("fail" as const)) : ("skipped" as const),
  ]);

  return respond(config, { db: dbCheck, openai: openaiCheck });
}
