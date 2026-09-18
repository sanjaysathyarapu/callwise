import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { assistants, documents } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: Request, ctx: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, docId } = await ctx.params;
  const [owned] = await db
    .select({ id: assistants.id })
    .from(assistants)
    .where(and(eq(assistants.id, id), eq(assistants.ownerId, session.user.id)))
    .limit(1);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Chunks are removed by the ON DELETE CASCADE on chunks.document_id.
  const deleted = await db
    .delete(documents)
    .where(and(eq(documents.id, docId), eq(documents.assistantId, id)))
    .returning({ id: documents.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
