import { describe, expect, it } from "vitest";
import { chunkText } from "./embed";

// A string with no whitespace and no repeated windows, so chunk boundaries and
// overlaps are easy to assert exactly (trim() never alters anything).
const sample = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(97 + (i % 26))).join("");

describe("chunkText", () => {
  it("returns no chunks for empty or whitespace-only input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\t  ")).toEqual([]);
  });

  it("returns a single trimmed chunk when the text fits in one chunk", () => {
    expect(chunkText("hello")).toEqual(["hello"]);
    expect(chunkText("  hello world \n")).toEqual(["hello world"]);
  });

  it("keeps text of exactly chunkSize characters in one chunk", () => {
    const text = sample(800);
    expect(chunkText(text)).toEqual([text]);
  });

  it("splits at chunkSize + 1 into two chunks that share exactly `overlap` characters", () => {
    const text = sample(801);
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(800);
    expect(chunks[1]).toHaveLength(151);
    expect(chunks[0].slice(-150)).toBe(chunks[1].slice(0, 150));
  });

  it("matches a hand-computed split for custom sizes", () => {
    // windows: [0,4) [3,7) [6,10)
    expect(chunkText("abcdefghij", 4, 1)).toEqual(["abcd", "defg", "ghij"]);
  });

  it("never produces a chunk larger than chunkSize", () => {
    for (const chunk of chunkText(sample(5000))) {
      expect(chunk.length).toBeLessThanOrEqual(800);
    }
  });

  it("reassembles to the original text once overlaps are removed", () => {
    const text = sample(3333);
    const chunks = chunkText(text);
    const rebuilt = chunks[0] + chunks.slice(1).map((c) => c.slice(150)).join("");
    expect(rebuilt).toBe(text);
  });

  it("produces ceil((n - overlap) / (chunkSize - overlap)) chunks and terminates on large input", () => {
    const cases: [number, number, number][] = [
      [100_000, 800, 150],
      [1450, 800, 150],
      [999, 100, 0],
      [10_000, 50, 49],
    ];
    for (const [n, size, overlap] of cases) {
      const chunks = chunkText(sample(n), size, overlap);
      expect(chunks).toHaveLength(Math.ceil((n - overlap) / (size - overlap)));
    }
  });

  it("drops chunks that are blank after trimming", () => {
    const chunks = chunkText("a" + " ".repeat(2000) + "b");
    expect(chunks.every((c) => c.length > 0)).toBe(true);
  });

  it("rejects arguments that could never terminate instead of hanging", () => {
    expect(() => chunkText("abc", 5, 5)).toThrow(RangeError);
    expect(() => chunkText("abc", 5, 9)).toThrow(RangeError);
    expect(() => chunkText("abc", 0, 0)).toThrow(RangeError);
    expect(() => chunkText("abc", 5, -1)).toThrow(RangeError);
    expect(() => chunkText("abc", Number.NaN, 0)).toThrow(RangeError);
  });
});
