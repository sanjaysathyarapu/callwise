"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";
import { makeSlug } from "@/lib/slug";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function userId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

const MAX_ASSISTANTS_PER_USER = 10;

export async function createAssistantAction(name: string): Promise<ActionResult> {
  const uid = await userId();
  if (!uid) return { ok: false, error: "Please log in again." };

  const parsed = z.string().trim().min(1, "Give your assistant a name.").max(60).safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const existing = await db.select({ id: assistants.id }).from(assistants).where(eq(assistants.ownerId, uid));
  if (existing.length >= MAX_ASSISTANTS_PER_USER) {
    return { ok: false, error: `You can have up to ${MAX_ASSISTANTS_PER_USER} assistants.` };
  }

  const [created] = await db
    .insert(assistants)
    .values({ ownerId: uid, name: parsed.data, slug: makeSlug(parsed.data) })
    .returning({ id: assistants.id });

  revalidatePath("/dashboard");
  revalidatePath("/assistants");
  return { ok: true, id: created.id };
}

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60),
  greeting: z.string().trim().max(200).optional(),
  systemPrompt: z.string().trim().min(10, "Instructions should be at least a sentence.").max(2000),
});

export async function updateAssistantAction(
  id: string,
  input: { name: string; greeting: string; systemPrompt: string }
): Promise<ActionResult> {
  const uid = await userId();
  if (!uid) return { ok: false, error: "Please log in again." };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const updated = await db
    .update(assistants)
    .set({
      name: parsed.data.name,
      greeting: parsed.data.greeting || null,
      systemPrompt: parsed.data.systemPrompt,
    })
    .where(and(eq(assistants.id, id), eq(assistants.ownerId, uid)))
    .returning({ id: assistants.id });
  if (updated.length === 0) return { ok: false, error: "Assistant not found." };

  revalidatePath("/dashboard");
  revalidatePath("/assistants");
  revalidatePath(`/assistants/${id}`, "layout");
  return { ok: true };
}

export async function deleteAssistantAction(id: string): Promise<ActionResult> {
  const uid = await userId();
  if (!uid) redirect("/login");

  const [target] = await db
    .select({ slug: assistants.slug })
    .from(assistants)
    .where(and(eq(assistants.id, id), eq(assistants.ownerId, uid)))
    .limit(1);
  if (target?.slug === "northwind-demo") {
    return { ok: false, error: "This assistant powers the public demo and can't be deleted." };
  }

  // Documents, chunks and conversations are removed by ON DELETE CASCADE.
  await db.delete(assistants).where(and(eq(assistants.id, id), eq(assistants.ownerId, uid)));

  revalidatePath("/dashboard");
  revalidatePath("/assistants");
  redirect("/assistants");
}
