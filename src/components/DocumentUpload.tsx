"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DocumentUpload({ assistantId }: { assistantId: string }) {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const res = await fetch(`/api/assistants/${assistantId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, content }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setStatus(`Indexed ${data.chunkCount} chunk(s) from "${filename}"`);
      setFilename("");
      setContent("");
      router.refresh();
    } else {
      setStatus("Failed to upload document");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        placeholder="Document name (e.g. faq.txt)"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        required
      />
      <textarea
        className="min-h-32 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        placeholder="Paste the document text your assistant should learn from..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Indexing..." : "Upload & index"}
      </button>
      {status && <p className="text-sm text-zinc-600 dark:text-zinc-400">{status}</p>}
    </form>
  );
}
