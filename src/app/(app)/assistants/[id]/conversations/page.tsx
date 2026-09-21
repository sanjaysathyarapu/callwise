import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { ConversationList } from "@/components/conversations/ConversationList";
import { getConversations, getOwnedAssistant } from "@/lib/data";

export const metadata: Metadata = { title: "Conversations" };
export const dynamic = "force-dynamic";

export default async function AssistantConversationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getOwnedAssistant(id);
  const items = await getConversations({ assistantIds: [id], limit: 50 });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <MessagesSquare className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          When customers chat or call this assistant, their conversations will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ConversationList items={items} />
      {items.length === 50 && <p className="text-xs text-muted-foreground">Showing the 50 most recent conversations.</p>}
    </div>
  );
}
