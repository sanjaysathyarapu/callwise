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

// Chunking lives in ./chunk (pure functions); re-exported so existing imports keep working.
export { chunkText, chunkStructured } from "./chunk";
