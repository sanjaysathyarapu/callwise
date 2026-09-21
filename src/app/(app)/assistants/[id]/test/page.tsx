import type { Metadata } from "next";
import { ChatWidget } from "@/components/ChatWidget";
import { getOwnedAssistant } from "@/lib/data";

export const metadata: Metadata = { title: "Test" };

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assistant = await getOwnedAssistant(id);

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Chat with {assistant.name} the way a customer would, by typing or with the microphone. Test conversations
        are saved to Conversations.
      </p>
      <ChatWidget assistantId={id} greeting={assistant.greeting ?? undefined} className="h-[32rem]" />
    </div>
  );
}
