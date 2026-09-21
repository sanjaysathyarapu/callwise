import { Badge } from "@/components/ui/badge";
import { LocalTime } from "@/components/LocalTime";
import type { ConversationItem } from "@/lib/data";
import { cn } from "@/lib/utils";

const CHANNEL_LABEL = { phone: "Phone", web_voice: "Web voice", web_chat: "Web chat" } as const;

export function ConversationList({
  items,
  showAssistant = false,
}: {
  items: ConversationItem[];
  showAssistant?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((c) => (
        <li key={c.id}>
          <details className="group rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none flex-col gap-1.5 px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{CHANNEL_LABEL[c.channel]}</Badge>
                  {showAssistant && <span className="font-medium text-foreground">{c.assistantName}</span>}
                  {c.channel === "phone" && c.callerIdentifier && <span>{c.callerIdentifier}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span>{c.msgs.length} messages</span>
                  <LocalTime iso={c.createdAt.toISOString()} />
                </span>
              </div>
              <p className="line-clamp-1 text-sm group-open:font-medium">
                {c.msgs.find((m) => m.role === "user")?.content ?? c.msgs[0].content}
              </p>
            </summary>
            <div className="flex flex-col gap-2 border-t px-4 py-3">
              {c.msgs.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                    m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted"
                  )}
                >
                  {m.content}
                </div>
              ))}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
