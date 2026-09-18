import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { assistants, conversations, messages } from "@/lib/db/schema";
import { LocalTime } from "@/components/LocalTime";

export const dynamic = "force-dynamic";

const CHANNEL_LABEL = {
  phone: "Phone",
  web_voice: "Web voice",
  web_chat: "Web chat",
} as const;

export default async function ConversationsPage({
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

  const recent = await db
    .select()
    .from(conversations)
    .where(eq(conversations.assistantId, id))
    .orderBy(desc(conversations.createdAt))
    .limit(50);

  const rows = recent.length
    ? await db
        .select()
        .from(messages)
        .where(
          inArray(
            messages.conversationId,
            recent.map((c) => c.id)
          )
        )
        .orderBy(asc(messages.createdAt))
    : [];

  const byConversation = new Map<string, typeof rows>();
  for (const m of rows) {
    const list = byConversation.get(m.conversationId) ?? [];
    list.push(m);
    byConversation.set(m.conversationId, list);
  }

  const items = recent
    .map((c) => ({ ...c, msgs: byConversation.get(c.id) ?? [] }))
    .filter((c) => c.msgs.length > 0);

  const totals = { phone: 0, web_voice: 0, web_chat: 0 };
  for (const c of items) totals[c.channel] += 1;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <Link href={`/dashboard/${id}`} className="text-sm text-zinc-500 hover:underline">
          &larr; {assistant.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-black dark:text-zinc-50">Conversations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {items.length === 0
            ? "Nothing yet."
            : `${items.length} recent · ${totals.phone} phone · ${totals.web_voice} web voice · ${totals.web_chat} web chat`}
        </p>
      </div>

      {items.length === 0 && (
        <p className="rounded border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
          When customers chat or call this assistant, their conversations will show up here.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((c) => (
          <li key={c.id}>
            <details className="group rounded-lg border border-zinc-200 dark:border-zinc-800">
              <summary className="flex cursor-pointer list-none flex-col gap-1 px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {CHANNEL_LABEL[c.channel]}
                    </span>
                    {c.channel === "phone" && c.callerIdentifier && <span>{c.callerIdentifier}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span>{c.msgs.length} messages</span>
                    <LocalTime iso={c.createdAt.toISOString()} />
                  </span>
                </div>
                <p className="line-clamp-1 text-sm text-black group-open:font-medium dark:text-zinc-50">
                  {c.msgs.find((m) => m.role === "user")?.content ?? c.msgs[0].content}
                </p>
              </summary>
              <div className="flex flex-col gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                {c.msgs.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "self-end bg-black text-white dark:bg-white dark:text-black"
                        : "self-start bg-zinc-100 text-black dark:bg-zinc-900 dark:text-zinc-50"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            </details>
          </li>
        ))}
      </ul>
      {recent.length === 50 && (
        <p className="text-xs text-zinc-500">Showing the 50 most recent conversations.</p>
      )}
    </div>
  );
}
