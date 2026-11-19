import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const insert = vi.fn();
  const batch = vi.fn();
  return { insert, batch };
});

vi.mock("@/lib/db", () => ({ db: { insert: mocks.insert, batch: mocks.batch } }));
vi.mock("node:crypto", () => ({ randomUUID: () => "11111111-1111-4111-8111-111111111111" }));

import { ingestDocument } from "./ingest";

const base = {
  assistantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  filename: "faq.txt",
  content: "hello world",
  pieces: ["hello", "world"],
  embeddings: [[0.1], [0.2]],
};

describe("ingestDocument", () => {
  let valuesCalls: unknown[][];

  beforeEach(() => {
    vi.clearAllMocks();
    valuesCalls = [];
    // Each insert(...) returns a builder whose values(...) records its argument and is
    // also chainable with .returning(), standing in for the Drizzle query objects.
    mocks.insert.mockImplementation((table: unknown) => ({
      values: (v: unknown) => {
        valuesCalls.push([table, v]);
        return Object.assign({ kind: "insert", table, v }, { returning: () => ({ kind: "insert-returning", table, v }) });
      },
    }));
  });

  it("writes the document and its chunks in a single batch", async () => {
    mocks.batch.mockResolvedValue([[{ id: "11111111-1111-4111-8111-111111111111" }], undefined]);
    const result = await ingestDocument(base);

    expect(mocks.batch).toHaveBeenCalledTimes(1);
    const queries = mocks.batch.mock.calls[0][0];
    expect(queries).toHaveLength(2);
    expect(result.chunkCount).toBe(2);
    expect(result.document.id).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("gives every chunk the generated document id", async () => {
    mocks.batch.mockResolvedValue([[{ id: "x" }], undefined]);
    await ingestDocument(base);

    const [[, docValues], [, chunkValues]] = valuesCalls as [[unknown, { id: string }], [unknown, { documentId: string }[]]];
    expect(docValues.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(chunkValues.map((c) => c.documentId)).toEqual([docValues.id, docValues.id]);
  });

  it("propagates a batch failure so the caller can report it, and issues no separate writes", async () => {
    mocks.batch.mockRejectedValue(new Error("chunk insert failed"));
    await expect(ingestDocument(base)).rejects.toThrow("chunk insert failed");
    // The only inserts built are the two queries handed to the single batch call.
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(mocks.batch).toHaveBeenCalledTimes(1);
  });

  it("rejects mismatched pieces and embeddings before touching the database", async () => {
    await expect(ingestDocument({ ...base, embeddings: [[0.1]] })).rejects.toThrow(/one embedding per chunk/);
    expect(mocks.batch).not.toHaveBeenCalled();
  });

  it("rejects an empty chunk list before touching the database", async () => {
    await expect(ingestDocument({ ...base, pieces: [], embeddings: [] })).rejects.toThrow(/at least one chunk/);
    expect(mocks.batch).not.toHaveBeenCalled();
  });
});
