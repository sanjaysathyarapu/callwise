import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChatWidget } from "@/components/ChatWidget";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [assistant] = await db.select().from(assistants).where(eq(assistants.slug, slug)).limit(1);
  if (!assistant) notFound();

  return (
    <div className="h-dvh p-0">
      <ChatWidget
        assistantId={assistant.id}
        greeting={assistant.greeting ?? `Hi, I'm ${assistant.name}. How can I help you today?`}
        className="h-full rounded-none border-0"
      />
    </div>
  );
}
