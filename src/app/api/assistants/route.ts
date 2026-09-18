import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(assistants)
    .where(eq(assistants.ownerId, session.user.id));

  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [assistant] = await db
    .insert(assistants)
    .values({ ownerId: session.user.id, name: parsed.data.name })
    .returning();

  return NextResponse.json(assistant);
}
