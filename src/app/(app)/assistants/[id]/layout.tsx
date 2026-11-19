import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AssistantTabs } from "@/components/assistants/AssistantTabs";
import { getOwnedAssistant } from "@/lib/data";

export default async function AssistantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assistant = await getOwnedAssistant(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/assistants" className="hover:text-foreground">
            Assistants
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="truncate text-foreground">{assistant.name}</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">{assistant.name}</h1>
      </div>
      <AssistantTabs id={id} />
      {children}
    </div>
  );
}
