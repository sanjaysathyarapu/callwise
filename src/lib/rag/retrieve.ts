import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chunks } from "@/lib/db/schema";
import { embedText } from "./embed";

export interface RetrievedChunk {
  content: string;
  distance: number;
}

// Cosine-distance nearest-neighbor search via pgvector's `<=>` operator.
export async function retrieveContext(
  assistantId: string,
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await db.execute<{ content: string; distance: number }>(sql`
    select content, embedding <=> ${vectorLiteral}::vector as distance
    from ${chunks}
    where assistant_id = ${assistantId}
    order by distance asc
    limit ${topK}
  `);

  return rows.rows.map((r) => ({ content: r.content, distance: Number(r.distance) }));
}
