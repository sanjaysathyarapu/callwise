import type { Metadata } from "next";
import { SettingsForm } from "@/components/assistants/SettingsForm";
import { getOwnedAssistant } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getOwnedAssistant(id);
  return (
    <SettingsForm
      id={id}
      initial={{ name: a.name, greeting: a.greeting ?? "", systemPrompt: a.systemPrompt }}
    />
  );
}
