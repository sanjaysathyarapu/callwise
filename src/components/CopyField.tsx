"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyField({ value, multiline = false }: { value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; the text stays selectable
    }
  }

  return (
    <div className="flex items-start gap-2">
      {multiline ? (
        <pre className="flex-1 overflow-x-auto rounded-md border bg-muted px-3 py-2 font-mono text-xs leading-relaxed">
          {value}
        </pre>
      ) : (
        <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs">{value}</code>
      )}
      <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
