"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { signOut } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/data";
import { db } from "@/lib/db";
import { assistants, users } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";

export type AccountState = { ok?: boolean; error?: string; message?: string } | undefined;

const NOT_SIGNED_IN: AccountState = { error: "Your session expired. Please log in again." };

export async function updateProfileAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await getCurrentUser();
  if (!user) return NOT_SIGNED_IN;

  const parsed = z.string().trim().min(1, "Enter your name.").max(100).safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.update(users).set({ name: parsed.data }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated." };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(8, "New password must be at least 8 characters.").max(100),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "The new passwords don't match.", path: ["confirm"] });

export async function changePasswordAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await getCurrentUser();
  if (!user) return NOT_SIGNED_IN;

  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.next === parsed.data.current) return { error: "Choose a password you haven't used just now." };

  const limit = await rateLimit(`account:password:${user.id}`, 10, 3600);
  if (!limit.ok) return { error: "Too many attempts. Please try again later." };

  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await bcrypt.compare(parsed.data.current, row.hash))) {
    return { error: "Your current password is incorrect." };
  }

  // Bumping the session version revokes every session, this device included, so the
  // user signs in again with the new password.
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(parsed.data.next, 10), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id));

  await signOut({ redirectTo: "/login?notice=password-changed" });
}

export async function signOutEverywhereAction() {
  const user = await getCurrentUser();
  if (user) {
    await db
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(eq(users.id, user.id));
  }
  await signOut({ redirectTo: "/login" });
}

export async function deleteAccountAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await getCurrentUser();
  if (!user) return NOT_SIGNED_IN;

  const password = formData.get("password");
  if (typeof password !== "string" || !password) return { error: "Enter your password to confirm." };

  const limit = await rateLimit(`account:delete:${user.id}`, 5, 3600);
  if (!limit.ok) return { error: "Too many attempts. Please try again later." };

  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await bcrypt.compare(password, row.hash))) return { error: "That password is incorrect." };

  const [demo] = await db
    .select({ id: assistants.id })
    .from(assistants)
    .where(and(eq(assistants.ownerId, user.id), eq(assistants.slug, "northwind-demo")))
    .limit(1);
  if (demo) {
    return { error: "This account owns the public demo assistant. Transfer it to another account before deleting." };
  }

  // Assistants, documents, indexed text and conversations are removed by ON DELETE CASCADE.
  await db.delete(users).where(eq(users.id, user.id));
  await signOut({ redirectTo: "/" });
}
