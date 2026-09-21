"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAssistantAction } from "@/lib/actions/assistants";

export function NewAssistantDialog({
  label = "New assistant",
  size = "default",
}: {
  label?: string;
  size?: "default" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await createAssistantAction(name);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Assistant created. Add some knowledge next.");
    setOpen(false);
    setName("");
    router.push(`/assistants/${result.id}/knowledge`);
  }

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <Plus />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Create an assistant</DialogTitle>
              <DialogDescription>
                Usually one per business or brand, for example &quot;Acme Support&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assistant-name">Name</Label>
              <Input
                id="assistant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Creating..." : "Create assistant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
