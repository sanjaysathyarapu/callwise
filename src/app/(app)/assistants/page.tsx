import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { NewAssistantDialog } from "@/components/assistants/NewAssistantDialog";
import { AssistantCard } from "@/components/dashboard/AssistantCard";
import { getAssistantSummaries, requireUser } from "@/lib/data";

export const metadata: Metadata = { title: "Assistants" };
export const dynamic = "force-dynamic";

export default async function AssistantsPage() {
  const user = await requireUser();
  const assistants = await getAssistantSummaries(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assistants</h1>
          <p className="text-sm text-muted-foreground">Each assistant has its own documents, conversations and settings.</p>
        </div>
        <NewAssistantDialog />
      </div>
      {assistants.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card py-16 text-center">
          <Bot className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No assistants yet.</p>
          <NewAssistantDialog label="Create assistant" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assistants.map((a) => (
            <AssistantCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
