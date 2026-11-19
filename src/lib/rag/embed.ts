import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const embeddingModel = openai.embedding("text-embedding-3-small");

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding;
}

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model: embeddingModel, values: chunks });
  return embeddings;
}

// Naive fixed-size chunker with overlap — good enough for short support docs/FAQs.
export function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  // With overlap >= chunkSize the window never advances and the loop below runs forever.
  if (!(chunkSize > 0 && overlap >= 0 && overlap < chunkSize)) {
    throw new RangeError("chunkText requires chunkSize > 0 and 0 <= overlap < chunkSize");
  }
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks.filter(Boolean);
}
