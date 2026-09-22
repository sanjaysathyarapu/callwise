import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Check, Circle, FileText, MessageSquare, Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NewAssistantDialog } from "@/components/assistants/NewAssistantDialog";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { AssistantCard } from "@/components/dashboard/AssistantCard";
import { ConversationList } from "@/components/conversations/ConversationList";
import { getAssistantSummaries, getConversations, getDailyActivity, requireUser } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Bot }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
        </div>
        <Icon className="size-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const assistants = await getAssistantSummaries(user.id);
  const ids = assistants.map((a) => a.id);
  const [activity, recent] = await Promise.all([
    getDailyActivity(ids, 14),
    getConversations({ assistantIds: ids, limit: 5 }),
  ]);

  const totals = {
    assistants: assistants.length,
    documents: assistants.reduce((s, a) => s + a.documents, 0),
    conversations: assistants.reduce((s, a) => s + a.conversations, 0),
    calls: assistants.reduce((s, a) => s + a.calls, 0),
  };
  const firstName = (user.name ?? "there").split(" ")[0];
  const target = assistants[0];

  const steps = [
    { label: "Create an assistant", done: totals.assistants > 0, href: null },
    { label: "Add your documents", done: totals.documents > 0, href: target ? `/assistants/${target.id}/knowledge` : null },
    { label: "Ask it a question", done: totals.conversations > 0, href: target ? `/assistants/${target.id}/test` : null },
    { label: "Share it with customers", done: false, href: target ? `/assistants/${target.id}/deploy` : null },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s how your assistants are doing.</p>
        </div>
        <NewAssistantDialog />
      </div>

      {assistants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Bot className="size-10 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">Create your first assistant</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                An assistant answers your customers&apos; questions using only the documents you give it. It takes about a
                minute to set up.
              </p>
            </div>
            <NewAssistantDialog label="Create assistant" size="lg" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Assistants" value={totals.assistants} icon={Bot} />
            <Stat label="Documents" value={totals.documents} icon={FileText} />
            <Stat label="Conversations" value={totals.conversations} icon={MessageSquare} />
            <Stat label="Phone calls" value={totals.calls} icon={Phone} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Conversations, last 14 days</CardTitle>
                <CardDescription>Chat, voice and phone across all your assistants.</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityChart data={activity} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Get started</CardTitle>
                <CardDescription>
                  {completed} of {steps.length} steps done
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Progress value={(completed / steps.length) * 100} />
                <ul className="flex flex-col gap-2.5">
                  {steps.map((s) => (
                    <li key={s.label} className="flex items-center gap-2.5 text-sm">
                      {s.done ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                      {s.href && !s.done ? (
                        <Link href={s.href} className="underline-offset-4 hover:underline">
                          {s.label}
                        </Link>
                      ) : (
                        <span className={cn(s.done && "text-muted-foreground line-through")}>{s.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your assistants</h2>
              <Link href="/assistants" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                View all
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {assistants.slice(0, 4).map((a) => (
                <AssistantCard key={a.id} a={a} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent conversations</h2>
              <Link href="/conversations" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
                No conversations yet. Try your assistant from its Test tab, or share its public link.
              </p>
            ) : (
              <ConversationList items={recent} showAssistant />
            )}
          </section>
        </>
      )}
    </div>
  );
}
