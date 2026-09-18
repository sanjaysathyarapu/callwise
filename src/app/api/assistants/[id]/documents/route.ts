import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { assistants, documents, chunks } from "@/lib/db/schema";
import { chunkText, embedChunks } from "@/lib/rag/embed";

async function requireOwnedAssistant(assistantId: string, userId: string) {
  const [assistant] = await db
    .select()
    .from(assistants)
    .where(and(eq(assistants.id, assistantId), eq(assistants.ownerId, userId)))
    .limit(1);
  return assistant ?? null;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const assistant = await requireOwnedAssistant(id, session.user.id);
  if (!assistant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db.select().from(documents).where(eq(documents.assistantId, id));
  return NextResponse.json(rows);
}

const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().min(1).max(200_000),
});

export async function POST(req: Request, ctx: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const assistant = await requireOwnedAssistant(id, session.user.id);
  if (!assistant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { filename, content } = parsed.data;

  const [document] = await db
    .insert(documents)
    .values({ assistantId: id, filename, content })
    .returning();

  const pieces = chunkText(content);
  const embeddings = await embedChunks(pieces);

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
