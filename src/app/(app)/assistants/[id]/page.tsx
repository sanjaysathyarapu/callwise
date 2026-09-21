import Link from "next/link";
import { Check, Circle, FileText, Layers, MessageSquare, Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalTime } from "@/components/LocalTime";
import { getAssistantStats, getOwnedAssistant } from "@/lib/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AssistantOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assistant = await getOwnedAssistant(id);
  const stats = await getAssistantStats(id);

  const cards = [
    { label: "Documents", value: stats.documents, icon: FileText },
    { label: "Indexed sections", value: stats.sections, icon: Layers },
    { label: "Conversations", value: stats.conversations, icon: MessageSquare },
    { label: "Phone calls", value: stats.calls, icon: Phone },
  ];
  const steps = [
    { label: "Add knowledge", done: stats.documents > 0, href: `/assistants/${id}/knowledge` },
    { label: "Test your assistant", done: stats.conversations > 0, href: `/assistants/${id}/test` },
    { label: "Share the link or embed it", done: false, href: `/assistants/${id}/deploy` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card size="sm" key={label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
              </div>
              <Icon className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>Get this assistant ready for customers.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-2.5 text-sm">
                  {s.done ? <Check className="size-4 text-emerald-600" /> : <Circle className="size-4 text-muted-foreground" />}
                  <Link href={s.href} className={cn("underline-offset-4 hover:underline", s.done && "text-muted-foreground")}>
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan and channels</CardTitle>
            <CardDescription>
              {stats.lastActivity ? (
                <>
                  Last conversation <LocalTime iso={stats.lastActivity.toISOString()} />
                </>
              ) : (
                "No conversations yet"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Web chat and voice</span>
              <span className="font-medium">Included</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Phone number</span>
              <span className="font-medium">{assistant.twilioNumber ?? "Premium feature"}</span>
            </div>
            <Link href={`/assistants/${id}/deploy`} className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}>
              Deployment options
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
