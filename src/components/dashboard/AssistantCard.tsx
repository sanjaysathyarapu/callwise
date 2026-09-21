import Link from "next/link";
import { FileText, MessageSquare, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LocalTime } from "@/components/LocalTime";
import type { AssistantSummary } from "@/lib/data";

export function AssistantCard({ a }: { a: AssistantSummary }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/assistants/${a.id}`} className="min-w-0 font-medium hover:underline">
            <span className="block truncate">{a.name}</span>
          </Link>
          <Badge variant={a.tier === "premium" ? "default" : "secondary"} className="capitalize">
            {a.tier}
          </Badge>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="size-3.5" /> {a.documents} {a.documents === 1 ? "doc" : "docs"}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" /> {a.conversations} {a.conversations === 1 ? "chat" : "chats"}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="size-3.5" /> {a.calls} {a.calls === 1 ? "call" : "calls"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {a.lastActivity ? (
              <>
                Last active <LocalTime iso={a.lastActivity.toISOString()} />
              </>
            ) : (
              "No activity yet"
            )}
          </p>
          <div className="flex gap-2">
            <Link href={`/assistants/${a.id}/test`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Test
            </Link>
            <Link href={`/assistants/${a.id}`} className={buttonVariants({ size: "sm" })}>
              Open
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
