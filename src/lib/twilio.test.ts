import { describe, expect, it } from "vitest";
import { conversationIdFor, escapeXml, publicUrl } from "./twilio";

const ASSISTANT = "88f0e737-8d43-458f-baf9-6e9575a9d0e4";
const CALL = "CA0123456789abcdef0123456789abcdef";

describe("conversationIdFor", () => {
  it("is deterministic, so every turn of one call lands in the same conversation", () => {
    expect(conversationIdFor(CALL, ASSISTANT)).toBe(conversationIdFor(CALL, ASSISTANT));
  });

  it("matches a pinned value (changing the formula would split in-progress calls)", () => {
    expect(conversationIdFor(CALL, ASSISTANT)).toBe("2ff55578-adff-5da1-afe1-96c1b0999f50");
  });

  it("is UUID-shaped with version 5 and variant 'a' nibbles", () => {
    expect(conversationIdFor(CALL, ASSISTANT)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("differs per call and per assistant", () => {
    const base = conversationIdFor(CALL, ASSISTANT);
    expect(conversationIdFor("CAother", ASSISTANT)).not.toBe(base);
    expect(conversationIdFor(CALL, "00000000-0000-4000-8000-000000000000")).not.toBe(base);
  });
});

describe("publicUrl", () => {
  const path = "/api/twilio/voice?assistantId=abc";
  const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers });

  it("prefers x-forwarded-proto and x-forwarded-host", () => {
    const r = req(`http://localhost:3000${path}`, {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "app.example.com",
    });
    expect(publicUrl(r)).toBe(`https://app.example.com${path}`);
  });

  it("falls back to the host header, keeping the request's own protocol", () => {
    const r = req(`http://localhost:3000${path}`, { host: "calls.example.com" });
    expect(publicUrl(r)).toBe(`http://calls.example.com${path}`);
  });

  it("x-forwarded-host wins over the host header", () => {
    const r = req(`http://localhost:3000${path}`, {
      host: "internal.local",
      "x-forwarded-host": "public.example.com",
    });
    expect(publicUrl(r)).toBe(`http://public.example.com${path}`);
  });

  it("uses the first value when a chain of proxies sends comma-separated forwarded headers", () => {
    const r = req(`http://localhost:3000${path}`, {
      "x-forwarded-proto": "https, http",
      "x-forwarded-host": "public.example.com, internal.local",
    });
    expect(publicUrl(r)).toBe(`https://public.example.com${path}`);
  });

  it("falls back to the URL's own host when no headers are present", () => {
    expect(publicUrl(req(`http://localhost:3000${path}`))).toBe(`http://localhost:3000${path}`);
    expect(publicUrl(req(`https://x.example.com${path}`))).toBe(`https://x.example.com${path}`);
  });

  it("preserves the path and query string exactly, and adds no '?' when there is none", () => {
    expect(publicUrl(req("https://x.com/p?a=1&b=x%20y"))).toBe("https://x.com/p?a=1&b=x%20y");
    expect(publicUrl(req("https://x.com/p"))).toBe("https://x.com/p");
  });
});

describe("escapeXml", () => {
  it("escapes all five XML special characters", () => {
    expect(escapeXml("<")).toBe("&lt;");
    expect(escapeXml(">")).toBe("&gt;");
    expect(escapeXml("&")).toBe("&amp;");
    expect(escapeXml("'")).toBe("&apos;");
    expect(escapeXml('"')).toBe("&quot;");
  });

  it("does not double-escape existing entities", () => {
    expect(escapeXml("&lt;")).toBe("&amp;lt;");
  });

  it("escapes a realistic mixed string", () => {
    expect(escapeXml(`Tom & "Jerry's" <b>`)).toBe("Tom &amp; &quot;Jerry&apos;s&quot; &lt;b&gt;");
  });

  it("leaves plain text and the empty string alone", () => {
    expect(escapeXml("Hello, world 123")).toBe("Hello, world 123");
    expect(escapeXml("")).toBe("");
  });
});
