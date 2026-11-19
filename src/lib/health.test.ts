import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConfigStatus } from "./config";
import { buildReport, runCheck, withTimeout } from "./health";

const allConfigured: ConfigStatus = { db: true, openai: true, auth: true, phone: true };

describe("buildReport", () => {
  it("is healthy (200) when config is complete and the database check passes", () => {
    const { httpStatus, report } = buildReport(allConfigured, { db: "ok", openai: "skipped" });
    expect(httpStatus).toBe(200);
    expect(report.status).toBe("ok");
  });

  it("is healthy when the deep OpenAI check also passes", () => {
    expect(buildReport(allConfigured, { db: "ok", openai: "ok" }).httpStatus).toBe(200);
  });

  it("is unhealthy (503) when the database check fails", () => {
    const { httpStatus, report } = buildReport(allConfigured, { db: "fail", openai: "skipped" });
    expect(httpStatus).toBe(503);
    expect(report.status).toBe("fail");
  });

  it("is unhealthy when the deep OpenAI check fails", () => {
    expect(buildReport(allConfigured, { db: "ok", openai: "fail" }).httpStatus).toBe(503);
  });

  it.each(["db", "openai", "auth"] as const)("is unhealthy when required config '%s' is missing", (group) => {
    const config = { ...allConfigured, [group]: false };
    expect(buildReport(config, { db: "ok", openai: "skipped" }).httpStatus).toBe(503);
  });

  it("ignores the optional phone line", () => {
    const config = { ...allConfigured, phone: false };
    expect(buildReport(config, { db: "ok", openai: "skipped" }).httpStatus).toBe(200);
  });

  it("passes the config and checks through unchanged", () => {
    const checks = { db: "ok", openai: "skipped" } as const;
    expect(buildReport(allConfigured, checks).report).toEqual({ status: "ok", config: allConfigured, checks });
  });
});

describe("withTimeout", () => {
  afterEach(() => vi.useRealTimers());

  it("resolves with the value when the promise settles in time", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it("rejects with the original error when the promise rejects", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000)).rejects.toThrow("boom");
  });

  it("rejects once the timeout elapses", async () => {
    vi.useFakeTimers();
    const assertion = expect(withTimeout(new Promise(() => {}), 1000)).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it("clears its timer when the promise settles first", async () => {
    vi.useFakeTimers();
    await withTimeout(Promise.resolve(1), 1000);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("runCheck", () => {
  afterEach(() => vi.useRealTimers());

  it("returns 'ok' when the check resolves", async () => {
    await expect(runCheck(() => Promise.resolve("anything"))).resolves.toBe("ok");
  });

  it("returns 'fail' when the check rejects, without exposing the error", async () => {
    await expect(runCheck(() => Promise.reject(new Error("postgresql://u:secret@h/db")))).resolves.toBe("fail");
  });

  it("returns 'fail' when the check throws synchronously", async () => {
    await expect(
      runCheck(() => {
        throw new Error("bad connection string");
      })
    ).resolves.toBe("fail");
  });

  it("returns 'fail' when the check hangs past the timeout", async () => {
    vi.useFakeTimers();
    const result = runCheck(() => new Promise(() => {}), 500);
    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toBe("fail");
  });
});
