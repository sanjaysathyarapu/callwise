"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteAssistantAction, updateAssistantAction } from "@/lib/actions/assistants";

export function SettingsForm({
  id,
  initial,
}: {
  id: string;
  initial: { name: string; greeting: string; systemPrompt: string };
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateAssistantAction(id, values);
    setSaving(false);
    if (result.ok) toast.success("Settings saved");
    else toast.error(result.error);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>How your assistant introduces itself and how it should behave.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={values.name} maxLength={60} required onChange={(e) => setValues({ ...values, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="greeting">Greeting</Label>
              <Input
                id="greeting"
                value={values.greeting}
                maxLength={200}
                placeholder={`Hi, I'm ${values.name || "your assistant"}. How can I help you today?`}
                onChange={(e) => setValues({ ...values, greeting: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Shown at the start of chats and spoken at the start of phone calls.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prompt">Instructions</Label>
              <Textarea
                id="prompt"
                className="min-h-36"
                value={values.systemPrompt}
                maxLength={2000}
                required
                onChange={(e) => setValues({ ...values, systemPrompt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Tone, boundaries and what to do when it doesn&apos;t know the answer. Answers are always grounded in your documents.
              </p>
            </div>
            <Button type="submit" disabled={saving || !dirty} className="self-start">
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete assistant</CardTitle>
          <CardDescription>
            Permanently removes this assistant, its documents and its conversations. This can&apos;t be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            Delete assistant
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${initial.name}"?`}
        description="All of its documents and conversations will be permanently deleted."
        confirmLabel="Delete forever"
        onConfirm={async () => {
          const result = await deleteAssistantAction(id);
          if (result && !result.ok) toast.error(result.error);
        }}
      />
    </div>
  );
}
