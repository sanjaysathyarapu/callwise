import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConversationFilters } from "@/components/conversations/ConversationFilters";
import { ConversationList } from "@/components/conversations/ConversationList";
import { PAGE_SIZE, parseFilters, rangeToSince } from "@/lib/conversation-filters";
import { getConversations, getOwnedAssistant } from "@/lib/data";

export const metadata: Metadata = { title: "Conversations" };
export const dynamic = "force-dynamic";

export default async function AssistantConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  await getOwnedAssistant(id);
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const items = await getConversations({
    assistantIds: [id],
    channel: filters.channel,
    search: filters.q,
    since: rangeToSince(filters.range),
    limit: filters.limit,
  });

  const filtered = Boolean(filters.channel || filters.q || filters.range !== "all");
  const base = `/assistants/${id}/conversations`;
  const more = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1])));
  more.set("limit", String(filters.limit + PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <ConversationFilters />
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <MessagesSquare className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filtered
              ? "No conversations match these filters."
              : "When customers chat or call this assistant, their conversations will show up here."}
          </p>
          {filtered && (
            <Link href={base} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <ConversationList items={items} />
          {items.length >= filters.limit && filters.limit < 200 && (
            <Link href={`${base}?${more.toString()}`} className={buttonVariants({ variant: "outline", className: "self-center" })}>
              Show more
            </Link>
          )}
        </>
      )}
    </div>
  );
}
