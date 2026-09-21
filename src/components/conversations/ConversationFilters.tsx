"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHANNEL_FILTERS, RANGE_FILTERS } from "@/lib/conversation-filters";

const selectClass =
  "h-8 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ConversationFilters({ assistants }: { assistants?: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const firstRender = useRef(true);

  function update(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.delete("limit");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // Search as you type, after a short pause.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() || undefined }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = ["assistant", "channel", "q", "range"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search messages"
          aria-label="Search messages"
          className="h-8 w-52 pl-8"
        />
      </div>
      {assistants && assistants.length > 1 && (
        <select
          aria-label="Assistant"
          className={selectClass}
          value={params.get("assistant") ?? ""}
          onChange={(e) => update({ assistant: e.target.value || undefined })}
        >
          <option value="">All assistants</option>
          {assistants.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="Channel"
        className={selectClass}
        value={params.get("channel") ?? "all"}
        onChange={(e) => update({ channel: e.target.value === "all" ? undefined : e.target.value })}
      >
        {CHANNEL_FILTERS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Date range"
        className={selectClass}
        value={params.get("range") ?? "all"}
        onChange={(e) => update({ range: e.target.value === "all" ? undefined : e.target.value })}
      >
        {RANGE_FILTERS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            router.push(pathname);
          }}
        >
          <X />
          Clear
        </Button>
      )}
    </div>
  );
}
