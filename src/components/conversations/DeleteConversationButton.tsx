"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteConversationAction } from "@/lib/actions/conversations";

export function DeleteConversationButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" className="self-end text-muted-foreground" onClick={() => setOpen(true)}>
        <Trash2 />
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this conversation?"
        description="The transcript will be permanently removed."
        confirmLabel="Delete"
        onConfirm={async () => {
          const result = await deleteConversationAction(id);
          if (result.ok) toast.success("Conversation deleted");
          else toast.error(result.error);
        }}
      />
    </>
  );
}
