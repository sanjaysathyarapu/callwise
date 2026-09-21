import { NextResponse } from "next/server";
import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/data";
import { db } from "@/lib/db";
import { assistants, documents, chunks } from "@/lib/db/schema";
import { chunkText, embedChunks } from "@/lib/rag/embed";
import { MAX_FILE_BYTES, UnsupportedFileError, extractText } from "@/lib/rag/extract";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const MAX_CHARS = 120_000;
const MAX_DOCUMENTS_PER_ASSISTANT = 25;

type Params = { params: Promise<{ id: string }> };

async function requireOwnedAssistant(assistantId: string, userId: string) {
  const [assistant] = await db
    .select()
    .from(assistants)
    .where(and(eq(assistants.id, assistantId), eq(assistants.ownerId, userId)))
    .limit(1);
  return assistant ?? null;
}

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET(_req: Request, ctx: Params) {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);

  const { id } = await ctx.params;
  if (!(await requireOwnedAssistant(id, user.id))) return fail("Not found", 404);

  const rows = await db.select().from(documents).where(eq(documents.assistantId, id));
  return NextResponse.json(rows);
}

const pasteSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().min(1),
});

export async function POST(req: Request, ctx: Params) {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);

  const { id } = await ctx.params;
  if (!(await requireOwnedAssistant(id, user.id))) return fail("Not found", 404);

  const limit = await rateLimit(`upload:user:${user.id}:hour`, 30, 3600);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const [{ total }] = await db
    .select({ total: count() })
    .from(documents)
    .where(eq(documents.assistantId, id));
  if (total >= MAX_DOCUMENTS_PER_ASSISTANT) {
    return fail(`Each assistant can hold up to ${MAX_DOCUMENTS_PER_ASSISTANT} documents.`, 400);
  }

  let filename: string;
  let content: string;

  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return fail("No file provided", 400);
    if (file.size > MAX_FILE_BYTES) return fail("Files are limited to 4 MB.", 400);
    filename = file.name.slice(0, 255);
    try {
      content = await extractText(file);
    } catch (error) {
      if (error instanceof UnsupportedFileError) return fail(error.message, 400);
      console.error("documents: text extraction failed", error);
      return fail("We couldn't read that file. Try a different one.", 422);
    }
  } else {
    const parsed = pasteSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("Invalid input", 400);
    filename = parsed.data.filename;
    content = parsed.data.content.trim();
  }

  if (!content) {
    return fail(
      "No readable text found. Scanned PDFs and images aren't supported yet; use a text-based file.",
      422
    );
  }
  if (content.length > MAX_CHARS) {
    return fail(`That document is too long (limit is about ${MAX_CHARS.toLocaleString()} characters).`, 400);
  }

  const pieces = chunkText(content);
  let embeddings: number[][];
  try {
    embeddings = await embedChunks(pieces);
  } catch (error) {
    console.error("documents: embedding failed", error);
    return fail("Indexing is temporarily unavailable. Please try again.", 502);
  }

  const [document] = await db
    .insert(documents)
    .values({ assistantId: id, filename, content })
    .returning();

  await db.insert(chunks).values(
    pieces.map((piece, i) => ({
      documentId: document.id,
      assistantId: id,
      content: piece,
      embedding: embeddings[i],
    }))
  );

  return NextResponse.json({ document, chunkCount: pieces.length });
}
