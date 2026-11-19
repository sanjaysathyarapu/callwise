import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execute, embedText, rateLimit } = vi.hoisted(() => ({
  execute: vi.fn(),
  embedText: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { execute } }));
vi.mock("@/lib/rag/embed", () => ({ embedText }));
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return { ...actual, rateLimit };
});

import { GET } from "./route";

const SECRETS = {
  DATABASE_URL: "postgresql://user:db-password-xyz@host.example/db",
  OPENAI_API_KEY: "sk-test-openai-secret",
  AUTH_SECRET: "auth-secret-value",
  TWILIO_AUTH_TOKEN: "twilio-token-value",
};

const request = (query = "", headers: Record<string, string> = {}) =>
  new Request(`http://localhost/api/health${query}`, { headers });

const json = async (res: Response) => JSON.parse(await res.text());

describe("GET /api/health", () => {
  beforeEach(() => {
    for (const [name, value] of Object.entries(SECRETS)) vi.stubEnv(name, value);
    execute.mockReset();
    execute.mockResolvedValue([{ ok: 1 }]);
    embedText.mockReset();
    embedText.mockResolvedValue([0.1, 0.2]);
    rateLimit.mockReset();
    rateLimit.mockResolvedValue({ ok: true, retryAfterSeconds: 1 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("returns 200 with config booleans and the database check, never caching", async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await json(res)).toEqual({
      status: "ok",
      config: { db: true, openai: true, auth: true, phone: true },
      checks: { db: "ok", openai: "skipped" },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does not call OpenAI or the rate limiter on a plain request", async () => {
    await GET(request());
    expect(embedText).not.toHaveBeenCalled();
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("stays healthy when the optional phone line is not configured", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect((await json(res)).config.phone).toBe(false);
  });

  it("returns 503 when the database query rejects", async () => {
    execute.mockRejectedValue(new Error("connection refused"));
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await json(res)).checks.db).toBe("fail");
  });

  it("returns 503, not a crash, when the database client throws synchronously", async () => {
    execute.mockImplementation(() => {
      throw new Error("invalid connection string");
    });
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect((await json(res)).checks.db).toBe("fail");
  });

  it("returns 503 without touching the database when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(execute).not.toHaveBeenCalled();
    expect(await json(res)).toMatchObject({ config: { db: false }, checks: { db: "fail" } });
  });

  it.each(["OPENAI_API_KEY", "AUTH_SECRET"])("returns 503 when %s is missing", async (name) => {
    vi.stubEnv(name, "");
    expect((await GET(request())).status).toBe(503);
  });

  it("returns 503 when the database hangs past the timeout", async () => {
    vi.useFakeTimers();
    execute.mockReturnValue(new Promise(() => {}));
    const pending = GET(request());
    await vi.advanceTimersByTimeAsync(4001);
    const res = await pending;
    expect(res.status).toBe(503);
    expect((await json(res)).checks.db).toBe("fail");
  });

  describe("?deep=1", () => {
    it("also checks OpenAI and returns 200 when both pass", async () => {
      const res = await GET(request("?deep=1", { "x-forwarded-for": "203.0.113.9" }));
      expect(res.status).toBe(200);
      expect((await json(res)).checks).toEqual({ db: "ok", openai: "ok" });
      expect(embedText).toHaveBeenCalledTimes(1);
    });

    it("rate limits per client IP", async () => {
      await GET(request("?deep=1", { "x-forwarded-for": "203.0.113.9" }));
      expect(rateLimit).toHaveBeenCalledWith(expect.stringContaining("203.0.113.9"), 10, 3600);
    });

    it("returns 503 when the OpenAI call fails, while the database is still ok", async () => {
      embedText.mockRejectedValue(new Error("401 expired_secret_key"));
      const res = await GET(request("?deep=1"));
      expect(res.status).toBe(503);
      expect((await json(res)).checks).toEqual({ db: "ok", openai: "fail" });
    });

    it("returns 503 when OPENAI_API_KEY is missing, without calling OpenAI", async () => {
      vi.stubEnv("OPENAI_API_KEY", "");
      const res = await GET(request("?deep=1"));
      expect(res.status).toBe(503);
      expect(embedText).not.toHaveBeenCalled();
    });

    it("returns 429 with Retry-After once the client is over the limit, spending nothing", async () => {
      rateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 123 });
      const res = await GET(request("?deep=1"));
      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("123");
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(embedText).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
    });

    it("returns 503 when the rate limiter itself fails, because that means the database is down", async () => {
      rateLimit.mockRejectedValue(new Error("db down"));
      const res = await GET(request("?deep=1"));
      expect(res.status).toBe(503);
      expect(await json(res)).toMatchObject({ checks: { db: "fail", openai: "skipped" } });
      expect(embedText).not.toHaveBeenCalled();
    });

    it("only triggers on deep=1 exactly", async () => {
      for (const query of ["?deep=true", "?deep=0", "?deep="]) {
        embedText.mockClear();
        const res = await GET(request(query));
        expect((await json(res)).checks.openai).toBe("skipped");
        expect(embedText).not.toHaveBeenCalled();
      }
    });
  });

  it("never leaks configuration values or error messages in any response", async () => {
    execute.mockRejectedValue(new Error("connect failed for postgresql://user:hunter2@host/db"));
    embedText.mockRejectedValue(new Error("Incorrect API key provided: sk-test-leaky-key"));

    const bodies = [await (await GET(request())).text(), await (await GET(request("?deep=1"))).text()];
    for (const body of bodies) {
      for (const secret of [...Object.values(SECRETS), "hunter2", "sk-test-leaky-key", "connect failed", "Incorrect API key"]) {
        expect(body).not.toContain(secret);
      }
    }
  });
});
