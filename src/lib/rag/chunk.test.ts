import { describe, expect, it } from "vitest";
import { chunkStructured } from "./chunk";

const LIMIT = 200;

describe("chunkStructured", () => {
  it("returns nothing for empty or whitespace-only input", () => {
    expect(chunkStructured("")).toEqual([]);
    expect(chunkStructured(" \n\n \n")).toEqual([]);
  });

  it("keeps short plain text as one chunk with no heading prefix", () => {
    expect(chunkStructured("Hello there.\nSecond line.")).toEqual(["Hello there. Second line."]);
  });

  it("prefixes each chunk with its heading path", () => {
    const md = "# Guide\n\n## Returns\nYou can return items within 60 days.\n\n## Shipping\nShipping takes 3 days.";
    expect(chunkStructured(md)).toEqual([
      "Guide > Returns\nYou can return items within 60 days.",
      "Guide > Shipping\nShipping takes 3 days.",
    ]);
  });

  it("never merges paragraphs from different sections", () => {
    const md = "## A\nalpha\n\n## B\nbeta";
    const chunks = chunkStructured(md);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).not.toContain("beta");
    expect(chunks[1]).not.toContain("alpha");
  });

  it("packs paragraphs of one section together up to the limit", () => {
    const md = "## S\nfirst paragraph here\n\nsecond paragraph here";
    expect(chunkStructured(md, LIMIT)).toEqual(["S\nfirst paragraph here\n\nsecond paragraph here"]);
  });

  it("starts a new chunk when the next paragraph would overflow", () => {
    const p = "word ".repeat(30).trim(); // 149 chars
    const chunks = chunkStructured(`## S\n${p}\n\n${p}`, LIMIT);
    expect(chunks).toHaveLength(2);
    for (const c of chunks) expect(c.startsWith("S\n")).toBe(true);
  });

  it("splits an oversized paragraph on sentence boundaries", () => {
    const sentence = "This is a fairly ordinary sentence of text.";
    const chunks = chunkStructured(Array(10).fill(sentence).join(" "), LIMIT);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(LIMIT);
      expect(c.endsWith(".")).toBe(true); // cut between sentences, not inside one
    }
  });

  it("splits a sentence longer than the limit on words, and a single huge token by length", () => {
    const longSentence = "word ".repeat(100).trim();
    for (const c of chunkStructured(longSentence, LIMIT)) expect(c.length).toBeLessThanOrEqual(LIMIT);
    const token = "x".repeat(LIMIT * 3 + 7);
    const pieces = chunkStructured(token, LIMIT);
    expect(pieces.every((c) => c.length <= LIMIT)).toBe(true);
    expect(pieces.join("")).toBe(token);
  });

  it("never exceeds maxChars, heading prefix included", () => {
    const md = `# Title\n\n## Section\n${"Some sentence goes here. ".repeat(60)}`;
    for (const c of chunkStructured(md, LIMIT)) expect(c.length).toBeLessThanOrEqual(LIMIT);
  });

  it("truncates a heading path that would leave no room for text", () => {
    const md = `# ${"H".repeat(500)}\nbody text`;
    const chunks = chunkStructured(md, LIMIT);
    expect(chunks.length).toBeGreaterThan(0);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(LIMIT);
    expect(chunks.join("\n")).toContain("body text");
  });

  it("resets deeper headings when a shallower one appears", () => {
    const md = "# T\n## A\n### A1\nx\n## B\ny";
    expect(chunkStructured(md)).toEqual(["T > A > A1\nx", "T > B\ny"]);
  });

  it("handles Windows line endings", () => {
    expect(chunkStructured("## A\r\nfoo\r\n\r\nbar")).toEqual(["A\nfoo\n\nbar"]);
  });

  it("keeps every word of the input (nothing is dropped)", () => {
    const md = "# T\n\n## One\nalpha beta gamma. delta epsilon.\n\n## Two\nzeta eta theta iota kappa lambda.";
    const out = chunkStructured(md, 40).join(" ");
    for (const w of ["alpha", "gamma", "epsilon", "zeta", "lambda"]) expect(out).toContain(w);
  });

  it("rejects a non-positive limit", () => {
    expect(() => chunkStructured("x", 0)).toThrow(RangeError);
  });
});
