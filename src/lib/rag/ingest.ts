import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { chunks, documents } from "@/lib/db/schema";

export interface IngestInput {
  assistantId: string;
  filename: string;
  content: string;
  pieces: string[];
  embeddings: number[][];
}

// Stores a document and all of its chunks as one all-or-nothing unit. The neon-http
// driver has no interactive transactions, but `db.batch` sends both inserts in a single
// transaction, so a failure can never leave a document without chunks. The document id is
// generated here so the chunk rows can reference it before the document row exists.
export async function ingestDocument(input: IngestInput) {
  const { assistantId, filename, content, pieces, embeddings } = input;
  if (pieces.length === 0) throw new Error("ingestDocument requires at least one chunk");
  if (pieces.length !== embeddings.length) {
    throw new Error("ingestDocument requires one embedding per chunk");
  }

  const documentId = randomUUID();
  const [documentRows] = await db.batch([
    db
      .insert(documents)
      .values({ id: documentId, assistantId, filename, content })
      .returning(),
    db.insert(chunks).values(
      pieces.map((piece, i) => ({
        documentId,
        assistantId,
        content: piece,
        embedding: embeddings[i],
      }))
    ),
  ]);
  return { document: documentRows[0], chunkCount: pieces.length };
}
