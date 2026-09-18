import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { assistants, documents } from "@/lib/db/schema";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentList } from "@/components/DocumentList";
import { ChatWidget } from "@/components/ChatWidget";

export default async function AssistantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [assistant] = await db
    .select()
    .from(assistants)
    .where(and(eq(assistants.id, id), eq(assistants.ownerId, session!.user.id)))
    .limit(1);

  if (!assistant) notFound();

  const docs = await db.select().from(documents).where(eq(documents.assistantId, id));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          &larr; All assistants
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-black dark:text-zinc-50">
          {assistant.name}
        </h1>
        <p className="text-sm text-zinc-500">{assistant.tier} tier</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Knowledge base
        </h2>
        <DocumentUpload assistantId={assistant.id} />
        <DocumentList
          assistantId={assistant.id}
          docs={docs.map((d) => ({ id: d.id, filename: d.filename }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Try it — text or voice (🎤)
        </h2>
        <ChatWidget assistantId={assistant.id} />
      </section>
    </div>
  );
}
