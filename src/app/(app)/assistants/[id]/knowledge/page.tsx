import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { KnowledgeManager } from "@/components/assistants/KnowledgeManager";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getOwnedAssistant } from "@/lib/data";

export const metadata: Metadata = { title: "Knowledge" };
export const dynamic = "force-dynamic";

export default async function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getOwnedAssistant(id);
  const rows = await db.select().from(documents).where(eq(documents.assistantId, id)).orderBy(desc(documents.createdAt));

  return (
    <KnowledgeManager
      assistantId={id}
      docs={rows.map((d) => ({
        id: d.id,
        filename: d.filename,
        characters: d.content.length,
        createdAt: d.createdAt.toISOString(),
      }))}
    />
  );
}
