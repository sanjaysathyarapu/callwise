import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConversationFilters } from "@/components/conversations/ConversationFilters";
import { ConversationList } from "@/components/conversations/ConversationList";
import { PAGE_SIZE, parseFilters, rangeToSince } from "@/lib/conversation-filters";
import { getAssistantSummaries, getConversations, requireUser } from "@/lib/data";

export const metadata: Metadata = { title: "Conversations" };
export const dynamic = "force-dynamic";

export default async function ConversationsInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const assistants = await getAssistantSummaries(user.id);
  const owned = new Set(assistants.map((a) => a.id));
  const assistantIds = filters.assistant && owned.has(filters.assistant) ? [filters.assistant] : [...owned];

  const items = await getConversations({
    assistantIds,
    channel: filters.channel,
    search: filters.q,
    since: rangeToSince(filters.range),
    limit: filters.limit,
  });

  const filtered = Boolean(filters.assistant || filters.channel || filters.q || filters.range !== "all");
  const more = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1])));
  more.set("limit", String(filters.limit + PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
        <p className="text-sm text-muted-foreground">Every chat, voice and phone conversation across your assistants.</p>
      </div>

      <ConversationFilters assistants={assistants.map((a) => ({ id: a.id, name: a.name }))} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card py-16 text-center">
          <MessagesSquare className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filtered ? "No conversations match these filters." : "Nothing here yet. Conversations appear as customers chat or call."}
          </p>
          {filtered && (
            <Link href="/conversations" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {items.length} conversation{items.length === 1 ? "" : "s"}
          </p>
          <ConversationList items={items} showAssistant />
          {items.length >= filters.limit && filters.limit < 200 && (
            <Link href={`/conversations?${more.toString()}`} className={buttonVariants({ variant: "outline", className: "self-center" })}>
              Show more
            </Link>
          )}
        </>
      )}
    </div>
  );
}
