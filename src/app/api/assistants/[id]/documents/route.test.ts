import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, rateLimit, embedChunks, ingestDocument } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  rateLimit: vi.fn(),
  embedChunks: vi.fn(),
  ingestDocument: vi.fn(),
}));
// The query-builder fake is created in a hoisted block so the vi.mock factory can use it.
const fake = await vi.hoisted(async () => {
  const { createDbFake } = await import("@/test/db-fake");
  return createDbFake();
});

vi.mock("@/lib/db", () => ({ db: fake.db }));
vi.mock("@/lib/data", () => ({ getCurrentUser }));
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return { ...actual, rateLimit };
});
vi.mock("@/lib/rag/embed", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rag/embed")>("@/lib/rag/embed");
  return { ...actual, embedChunks };
});
vi.mock("@/lib/rag/ingest", () => ({ ingestDocument }));

import { POST } from "./route";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ctx = { params: Promise.resolve({ id: ID }) };

const paste = (payload: unknown) =>
  POST(
    new Request(`http://localhost/api/assistants/${ID}/documents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
    ctx
  );

const upload = (file: File) => {
  const form = new FormData();
  form.set("file", file);
  return POST(new Request(`http://localhost/api/assistants/${ID}/documents`, { method: "POST", body: form }), ctx);
};

// Queue: ownership lookup, then the document count.
const owned = (total = 0) => fake.queue([{ id: ID }], [{ total }]);

beforeEach(() => {
  fake.reset();
  getCurrentUser.mockReset();
  getCurrentUser.mockResolvedValue({ id: "user-1" });
  rateLimit.mockReset();
  rateLimit.mockResolvedValue({ ok: true, retryAfterSeconds: 1 });
  embedChunks.mockReset();
  embedChunks.mockImplementation(async (pieces: string[]) => pieces.map(() => [0.1]));
  ingestDocument.mockReset();
  ingestDocument.mockImplementation(async (i: { pieces: string[] }) => ({
    document: { id: "doc-1" },
    chunkCount: i.pieces.length,
  }));
});

describe("POST /api/assistants/[id]/documents", () => {
  it("requires a signed-in user", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect((await paste({ filename: "a.txt", content: "hi" })).status).toBe(401);
  });

  it("returns 404 when the assistant is not owned by the caller", async () => {
    fake.queue([]);
    expect((await paste({ filename: "a.txt", content: "hi" })).status).toBe(404);
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it("answers 429 when the upload limit is reached", async () => {
    fake.queue([{ id: ID }]);
    rateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });
    expect((await paste({ filename: "a.txt", content: "hi" })).status).toBe(429);
  });

  it("refuses more than 25 documents per assistant", async () => {
    owned(25);
    const res = await paste({ filename: "a.txt", content: "hi" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/25 documents/);
  });

  it("rejects invalid pasted input", async () => {
    owned();
    expect((await paste({ filename: "", content: "hi" })).status).toBe(400);
    owned();
    expect((await paste({ content: "hi" })).status).toBe(400);
  });

  it("rejects text that is empty after trimming", async () => {
    owned();
    const res = await paste({ filename: "a.txt", content: "   \n " });
    expect([400, 422]).toContain(res.status);
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it("rejects text over the length limit", async () => {
    owned();
    const res = await paste({ filename: "a.txt", content: "x".repeat(120_001) });
    expect(res.status).toBe(400);
    expect(embedChunks).not.toHaveBeenCalled();
  });

  it("rejects an unsupported file type with a clear message", async () => {
    owned();
    const res = await upload(new File(["data"], "photo.png", { type: "image/png" }));
    expect(res.status).toBe(400);
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it("rejects a file over 4 MB", async () => {
    owned();
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.txt", { type: "text/plain" });
    const res = await upload(big);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/4 MB/);
  });

  it("returns 502 and stores nothing when embedding fails", async () => {
    owned();
    embedChunks.mockRejectedValue(new Error("openai down"));
    const res = await paste({ filename: "a.txt", content: "hello world" });
    expect(res.status).toBe(502);
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it("returns 500 with a friendly message when saving fails", async () => {
    owned();
    ingestDocument.mockRejectedValue(new Error("db down"));
    const res = await paste({ filename: "a.txt", content: "hello world" });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/couldn't save/);
  });

  it("indexes pasted text and reports the chunk count", async () => {
    owned();
    const res = await paste({ filename: "faq.txt", content: "  hello world  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ document: { id: "doc-1" }, chunkCount: 1 });
    expect(ingestDocument).toHaveBeenCalledWith(
      expect.objectContaining({ assistantId: ID, filename: "faq.txt", content: "hello world" })
    );
  });

  it("indexes an uploaded text file", async () => {
    owned();
    const res = await upload(new File(["Shipping takes 3 days."], "shipping.txt", { type: "text/plain" }));
    expect(res.status).toBe(200);
    expect(ingestDocument).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "shipping.txt", content: "Shipping takes 3 days." })
    );
  });
});
