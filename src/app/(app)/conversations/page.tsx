import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { ConversationList } from "@/components/conversations/ConversationList";
import { getAssistantSummaries, getConversations, requireUser, type Channel } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Conversations" };
export const dynamic = "force-dynamic";

const FILTERS: { value: Channel | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "phone", label: "Phone" },
  { value: "web_voice", label: "Web voice" },
  { value: "web_chat", label: "Web chat" },
];

export default async function ConversationsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const user = await requireUser();
  const { channel } = await searchParams;
  const active = FILTERS.find((f) => f.value === channel)?.value ?? "all";

  const assistants = await getAssistantSummaries(user.id);
  const items = await getConversations({
    assistantIds: assistants.map((a) => a.id),
    channel: active === "all" ? undefined : active,
    limit: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
        <p className="text-sm text-muted-foreground">Every chat, voice and phone conversation across your assistants.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/conversations" : `/conversations?channel=${f.value}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              active === f.value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <MessagesSquare className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing here yet. Conversations appear as customers chat or call.</p>
        </div>
      ) : (
        <ConversationList items={items} showAssistant />
      )}
    </div>
  );
}
