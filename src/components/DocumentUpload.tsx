"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_BYTES = 4 * 1024 * 1024;

export function DocumentUpload({ assistantId }: { assistantId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function send(body: BodyInit, headers: HeadersInit | undefined, label: string) {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/assistants/${assistantId}/documents`, {
        method: "POST",
        headers,
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ ok: false, message: data.error ?? "Failed to upload document" });
        return false;
      }
      setStatus({ ok: true, message: `Indexed "${label}" (${data.chunkCount} section(s))` });
      router.refresh();
      return true;
    } catch {
      setStatus({ ok: false, message: "Network error. Please try again." });
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setStatus({ ok: false, message: "Files are limited to 4 MB." });
    } else {
      const form = new FormData();
      form.append("file", file);
      await send(form, undefined, file.name);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handlePaste(e: React.FormEvent) {
    e.preventDefault();
    const ok = await send(
      JSON.stringify({ filename, content }),
      { "Content-Type": "application/json" },
      filename
    );
    if (ok) {
      setFilename("");
      setContent("");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <label htmlFor="file" className="text-sm font-medium text-black dark:text-zinc-50">
          Upload a file
        </label>
        <input
          id="file"
          ref={fileInput}
          type="file"
          accept=".pdf,.docx,.txt,.md,.markdown,.csv"
          disabled={loading}
          onChange={handleFile}
          className="text-sm text-zinc-600 file:mr-3 file:rounded file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:text-zinc-400 dark:file:bg-white dark:file:text-black"
        />
        <p className="text-xs text-zinc-500">PDF, Word (.docx), text, Markdown or CSV. Up to 4 MB.</p>
      </div>

      <form onSubmit={handlePaste} className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">Or paste text directly</p>
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
      </form>

      {loading && <p className="text-sm text-zinc-500">Reading and indexing your document...</p>}
      {status && (
        <p className={`text-sm ${status.ok ? "text-zinc-600 dark:text-zinc-400" : "text-red-600"}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
