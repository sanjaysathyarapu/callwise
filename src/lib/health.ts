import type { ConfigStatus } from "./config";

export type CheckResult = "ok" | "fail" | "skipped";

export interface HealthChecks {
  db: CheckResult;
  openai: CheckResult;
}

export interface HealthReport {
  status: "ok" | "fail";
  config: ConfigStatus;
  checks: HealthChecks;
}

export const CHECK_TIMEOUT_MS = 4000;

// The database, OpenAI and auth are required; the phone line is optional (it is meant
// to be off by default), so it never affects health.
export function buildReport(config: ConfigStatus, checks: HealthChecks): { report: HealthReport; httpStatus: 200 | 503 } {
  const healthy =
    config.db && config.openai && config.auth && checks.db === "ok" && checks.openai !== "fail";
  return {
    httpStatus: healthy ? 200 : 503,
    report: { status: healthy ? "ok" : "fail", config, checks },
  };
}

export async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Any failure (a rejection, a synchronous throw, or a timeout) is just "fail". The error
// is dropped on purpose so nothing from it, such as a connection string, can reach the response.
export async function runCheck(fn: () => PromiseLike<unknown>, ms = CHECK_TIMEOUT_MS): Promise<"ok" | "fail"> {
  try {
    await withTimeout(fn(), ms);
    return "ok";
  } catch {
    return "fail";
  }
}
