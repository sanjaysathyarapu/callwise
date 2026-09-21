import { NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/data";
import { db } from "@/lib/db";
import { assistants, conversations, documents, messages } from "@/lib/db/schema";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Everything we hold about the signed-in user, as a JSON download.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await rateLimit(`account:export:${user.id}`, 5, 3600);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const owned = await db.select().from(assistants).where(eq(assistants.ownerId, user.id));
  const ids = owned.map((a) => a.id);

  const [docs, convs] = await Promise.all([
    ids.length ? db.select().from(documents).where(inArray(documents.assistantId, ids)) : [],
    ids.length ? db.select().from(conversations).where(inArray(conversations.assistantId, ids)) : [],
  ]);
  const msgs = convs.length
    ? await db
        .select()
        .from(messages)
        .where(inArray(messages.conversationId, convs.map((c) => c.id)))
        .orderBy(asc(messages.createdAt))
    : [];

  const data = {
    exportedAt: new Date().toISOString(),
    account: { name: user.name, email: user.email },
    assistants: owned.map((a) => ({
      name: a.name,
      tier: a.tier,
      greeting: a.greeting,
      instructions: a.systemPrompt,
      publicSlug: a.slug,
      phoneNumber: a.twilioNumber,
      createdAt: a.createdAt,
      documents: docs
        .filter((d) => d.assistantId === a.id)
        .map((d) => ({ filename: d.filename, content: d.content, uploadedAt: d.createdAt })),
      conversations: convs
        .filter((c) => c.assistantId === a.id)
        .map((c) => ({
          channel: c.channel,
          caller: c.callerIdentifier,
          startedAt: c.createdAt,
          messages: msgs
            .filter((m) => m.conversationId === c.id)
            .map((m) => ({ role: m.role, content: m.content, at: m.createdAt })),
        })),
    })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="callwise-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
