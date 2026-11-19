import { beforeEach, describe, expect, it, vi } from "vitest";

// Deterministic suffix: randomBytes(3) -> "abcdef".
const { randomBytes } = vi.hoisted(() => ({
  randomBytes: vi.fn<(size: number) => Buffer>(() => Buffer.from([0xab, 0xcd, 0xef])),
}));
vi.mock("crypto", () => ({ default: { randomBytes } }));

import { makeSlug } from "./slug";

describe("makeSlug", () => {
  beforeEach(() => randomBytes.mockClear());

  it("lowercases and hyphenates a simple name", () => {
    expect(makeSlug("Acme Support")).toBe("acme-support-abcdef");
  });

  it("collapses runs of punctuation and whitespace and trims the ends", () => {
    expect(makeSlug("  Hello,   World!!  ")).toBe("hello-world-abcdef");
    expect(makeSlug("---Edge---Case---")).toBe("edge-case-abcdef");
  });

  it("keeps digits and turns symbols into separators", () => {
    expect(makeSlug("Brightside Cafe #2")).toBe("brightside-cafe-2-abcdef");
    expect(makeSlug("24/7 Support")).toBe("24-7-support-abcdef");
  });

  it("caps the readable part at 40 characters", () => {
    const slug = makeSlug("a".repeat(100));
    expect(slug).toBe(`${"a".repeat(40)}-abcdef`);
  });

  it("falls back to 'assistant' when nothing usable is left", () => {
    expect(makeSlug("")).toBe("assistant-abcdef");
    expect(makeSlug("!!!")).toBe("assistant-abcdef");
    expect(makeSlug("😀😀")).toBe("assistant-abcdef");
    expect(makeSlug("日本語")).toBe("assistant-abcdef");
  });

  it("strips accents instead of splitting words at them", () => {
    expect(makeSlug("Café Crème")).toBe("cafe-creme-abcdef");
    expect(makeSlug("Zoë's Bäckerei")).toBe("zoe-s-backerei-abcdef");
  });

  it("never leaves a trailing hyphen on the readable part after truncating", () => {
    // The 40-character cut lands right after the hyphen that precedes "tail".
    const slug = makeSlug(`${"x".repeat(39)} tail`);
    expect(slug).toBe(`${"x".repeat(39)}-abcdef`);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*-[0-9a-f]{6}$/);
  });

  it("appends a suffix made from 3 random bytes (6 hex characters)", () => {
    makeSlug("x");
    expect(randomBytes).toHaveBeenCalledWith(3);
    expect(makeSlug("x")).toMatch(/-[0-9a-f]{6}$/);
  });
});
