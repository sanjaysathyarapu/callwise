import { afterEach, describe, expect, it, vi } from "vitest";
import { configStatus } from "./config";

const full = {
  DATABASE_URL: "postgresql://user:pw@host/db",
  OPENAI_API_KEY: "sk-test-123",
  AUTH_SECRET: "auth-secret",
  TWILIO_AUTH_TOKEN: "twilio-token",
};

describe("configStatus", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reports every group as configured when all variables are set", () => {
    expect(configStatus(full)).toEqual({ db: true, openai: true, auth: true, phone: true });
  });

  it("reports every group as missing for an empty environment", () => {
    expect(configStatus({})).toEqual({ db: false, openai: false, auth: false, phone: false });
  });

  it("maps each variable to exactly one group", () => {
    expect(configStatus({ DATABASE_URL: "x" })).toEqual({ db: true, openai: false, auth: false, phone: false });
    expect(configStatus({ OPENAI_API_KEY: "x" })).toEqual({ db: false, openai: true, auth: false, phone: false });
    expect(configStatus({ AUTH_SECRET: "x" })).toEqual({ db: false, openai: false, auth: true, phone: false });
    expect(configStatus({ TWILIO_AUTH_TOKEN: "x" })).toEqual({ db: false, openai: false, auth: false, phone: true });
  });

  it("treats empty and whitespace-only values as missing", () => {
    expect(configStatus({ DATABASE_URL: "", OPENAI_API_KEY: "   ", AUTH_SECRET: "\n", TWILIO_AUTH_TOKEN: "\t" })).toEqual({
      db: false,
      openai: false,
      auth: false,
      phone: false,
    });
  });

  it("does not count unrelated Twilio variables as the phone switch", () => {
    expect(configStatus({ TWILIO_ACCOUNT_SID: "AC123", TWILIO_PHONE_NUMBER: "+15555550100" }).phone).toBe(false);
  });

  it("returns only booleans and never any value from the environment", () => {
    const status = configStatus(full);
    expect(Object.values(status).every((v) => typeof v === "boolean")).toBe(true);
    const serialized = JSON.stringify(status);
    for (const secret of Object.values(full)) expect(serialized).not.toContain(secret);
  });

  it("reads process.env by default", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(configStatus()).toMatchObject({ db: true, openai: false });
  });
});
