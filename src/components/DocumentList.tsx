"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DocumentList({
  assistantId,
  docs,
}: {
  assistantId: string;
  docs: { id: string; filename: string }[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(docId: string) {
    setBusyId(docId);
    await fetch(`/api/assistants/${assistantId}/documents/${docId}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  if (docs.length === 0) {
    return <p className="text-sm text-zinc-500">No documents yet. Add one above.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{d.filename}</span>
          <button
            type="button"
            onClick={() => remove(d.id)}
            disabled={busyId === d.id}
            className="text-xs text-zinc-500 hover:text-red-600 disabled:opacity-50"
          >
            {busyId === d.id ? "Removing..." : "Remove"}
          </button>
        </li>
      ))}
    </ul>
  );
}
