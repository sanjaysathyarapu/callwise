import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_LIMIT, PAGE_SIZE, parseFilters, rangeToSince } from "./conversation-filters";

const UUID = "88f0e737-8d43-458f-baf9-6e9575a9d0e4";

describe("parseFilters", () => {
  it("returns sensible defaults for empty params", () => {
    expect(parseFilters({})).toEqual({
      assistant: undefined,
      channel: undefined,
      q: undefined,
      range: "all",
      limit: PAGE_SIZE,
    });
  });

  it("accepts the three real channels and ignores 'all' and unknown values", () => {
    expect(parseFilters({ channel: "phone" }).channel).toBe("phone");
    expect(parseFilters({ channel: "web_voice" }).channel).toBe("web_voice");
    expect(parseFilters({ channel: "web_chat" }).channel).toBe("web_chat");
    expect(parseFilters({ channel: "all" }).channel).toBeUndefined();
    expect(parseFilters({ channel: "sms" }).channel).toBeUndefined();
    expect(parseFilters({ channel: "" }).channel).toBeUndefined();
  });

  it("keeps a valid UUID (any case) and drops anything else", () => {
    expect(parseFilters({ assistant: UUID }).assistant).toBe(UUID);
    expect(parseFilters({ assistant: UUID.toUpperCase() }).assistant).toBe(UUID.toUpperCase());
    expect(parseFilters({ assistant: "not-a-uuid" }).assistant).toBeUndefined();
    expect(parseFilters({ assistant: `${UUID}'; drop table users;--` }).assistant).toBeUndefined();
  });

  it("trims the search text, drops blanks and caps it at 100 characters", () => {
    expect(parseFilters({ q: "  refund  " }).q).toBe("refund");
    expect(parseFilters({ q: "" }).q).toBeUndefined();
    expect(parseFilters({ q: "   " }).q).toBeUndefined();
    expect(parseFilters({ q: "x".repeat(150) }).q).toHaveLength(100);
  });

  it("accepts the known ranges and falls back to 'all'", () => {
    for (const r of ["all", "7d", "30d", "90d"] as const) {
      expect(parseFilters({ range: r }).range).toBe(r);
    }
    expect(parseFilters({ range: "1y" }).range).toBe("all");
    expect(parseFilters({ range: "" }).range).toBe("all");
  });

  it("clamps the limit between one page and MAX_LIMIT", () => {
    expect(parseFilters({ limit: "50" }).limit).toBe(50);
    expect(parseFilters({ limit: "10" }).limit).toBe(PAGE_SIZE);
    expect(parseFilters({ limit: "9999" }).limit).toBe(MAX_LIMIT);
    expect(parseFilters({ limit: "-5" }).limit).toBe(PAGE_SIZE);
    expect(parseFilters({ limit: "0" }).limit).toBe(PAGE_SIZE);
    expect(parseFilters({ limit: "abc" }).limit).toBe(PAGE_SIZE);
    expect(parseFilters({ limit: "" }).limit).toBe(PAGE_SIZE);
    expect(parseFilters({ limit: undefined }).limit).toBe(PAGE_SIZE);
  });
});

describe("rangeToSince", () => {
  afterEach(() => vi.useRealTimers());

  it("returns undefined for 'all'", () => {
    expect(rangeToSince("all")).toBeUndefined();
  });

  it("subtracts exactly 7, 30 and 90 days from now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    expect(rangeToSince("7d")?.toISOString()).toBe("2026-06-08T12:00:00.000Z");
    expect(rangeToSince("30d")?.toISOString()).toBe("2026-05-16T12:00:00.000Z");
    expect(rangeToSince("90d")?.toISOString()).toBe("2026-03-17T12:00:00.000Z");
  });
});
