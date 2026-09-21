"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LocalTime } from "@/components/LocalTime";

const MAX_BYTES = 4 * 1024 * 1024;

export interface DocRow {
  id: string;
  filename: string;
  characters: number;
  createdAt: string;
}

export function KnowledgeManager({ assistantId, docs }: { assistantId: string; docs: DocRow[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocRow | null>(null);

  async function send(body: BodyInit, headers: HeadersInit | undefined, label: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/assistants/${assistantId}/documents`, { method: "POST", headers, body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return false;
      }
      toast.success(`Indexed "${label}" (${data.chunkCount} section${data.chunkCount === 1 ? "" : "s"})`);
      router.refresh();
      return true;
    } catch {
      toast.error("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Files are limited to 4 MB.");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    await send(form, undefined, file.name);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function paste(e: React.FormEvent) {
    e.preventDefault();
    const ok = await send(JSON.stringify({ filename, content }), { "Content-Type": "application/json" }, filename);
    if (ok) {
      setFilename("");
      setContent("");
    }
  }

  async function remove(doc: DocRow) {
    const res = await fetch(`/api/assistants/${assistantId}/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`Removed "${doc.filename}"`);
      router.refresh();
    } else {
      toast.error("Couldn't remove that document.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void uploadFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          {loading ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <Upload className="size-6 text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium">{loading ? "Reading and indexing..." : "Drop a file here"}</p>
            <p className="text-xs text-muted-foreground">PDF, Word (.docx), text, Markdown or CSV. Up to 4 MB.</p>
          </div>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".pdf,.docx,.txt,.md,.markdown,.csv"
            onChange={(e) => void uploadFile(e.target.files?.[0])}
          />
          <Button variant="outline" disabled={loading} onClick={() => fileInput.current?.click()}>
            Choose file
          </Button>
        </div>

        <form onSubmit={paste} className="flex flex-col gap-3">
          <p className="text-sm font-medium">Or paste text</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="doc-name">Document name</Label>
            <Input id="doc-name" placeholder="faq.txt" value={filename} onChange={(e) => setFilename(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="doc-content">Content</Label>
            <Textarea
              id="doc-content"
              className="min-h-32"
              placeholder="Paste the policies, FAQs or product details your assistant should know."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="self-start">
            {loading ? "Indexing..." : "Add to knowledge base"}
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          Documents <span className="text-muted-foreground">({docs.length}/25)</span>
        </p>
        {docs.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Nothing here yet. Add a document and your assistant will start answering from it.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.characters.toLocaleString()} characters · <LocalTime iso={d.createdAt} />
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Remove ${d.filename}`} onClick={() => setPendingDelete(d)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove this document?"
        description={`"${pendingDelete?.filename ?? ""}" will be removed and your assistant will stop using it.`}
        confirmLabel="Remove"
        onConfirm={() => (pendingDelete ? remove(pendingDelete) : undefined)}
      />
    </div>
  );
}
