"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { signIn, signOut } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";

// `values` echoes what was typed so React 19 doesn't blank the form after a failed submit.
export type FormState = { error?: string; values?: { name?: string; email?: string } } | undefined;

function typed(formData: FormData) {
  const text = (key: string) => (typeof formData.get(key) === "string" ? (formData.get(key) as string) : undefined);
  return { name: text("name"), email: text("email") };
}

// Only allow same-site relative redirects so a crafted link can't bounce users elsewhere.
function safeRedirect(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password.", values: typed(formData) };

  const limit = await rateLimit(`login:${await clientIp()}`, 10, 600);
  if (!limit.ok) return { error: "Too many attempts. Please wait a few minutes and try again.", values: typed(formData) };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirect(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password.", values: typed(formData) };
    throw error; // the success redirect is thrown by Next and must propagate
  }
}

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(100),
});

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: typed(formData) };

  const limit = await rateLimit(`signup:${await clientIp()}`, 5, 3600);
  if (!limit.ok) return { error: "Too many sign-ups from this network. Please try again later.", values: typed(formData) };

  const email = parsed.data.email.toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (existing) return { error: "An account with that email already exists. Try logging in.", values: typed(formData) };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.insert(users).values({ name: parsed.data.name, email, passwordHash });

  try {
    await signIn("credentials", { email, password: parsed.data.password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Account created. Please log in." };
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
