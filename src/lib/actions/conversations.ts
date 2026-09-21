"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/data";
import { db } from "@/lib/db";
import { assistants, conversations } from "@/lib/db/schema";
import type { ActionResult } from "@/lib/actions/assistants";

export async function deleteConversationAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in again." };

  // Only conversations that belong to one of the user's own assistants can be deleted.
  const mine = db.select({ id: assistants.id }).from(assistants).where(eq(assistants.ownerId, user.id));
  const owned = await mine;
  if (owned.length === 0) return { ok: false, error: "Conversation not found." };

  const deleted = await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), inArray(conversations.assistantId, owned.map((a) => a.id))))
    .returning({ id: conversations.id });
  if (deleted.length === 0) return { ok: false, error: "Conversation not found." };

  revalidatePath("/conversations");
  revalidatePath("/dashboard");
  revalidatePath("/assistants", "layout");
  return { ok: true };
}
