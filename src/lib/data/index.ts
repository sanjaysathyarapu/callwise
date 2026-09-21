import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { and, asc, count, desc, eq, gte, inArray, max, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { assistants, chunks, conversations, documents, messages, users } from "@/lib/db/schema";

export type Channel = "phone" | "web_voice" | "web_chat";

// The signed-in user, read fresh from the database. Returns null when there is no
// session or when the session was revoked (password change, "sign out everywhere").
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!row || row.sessionVersion !== (session.user.sv ?? 0)) return null;
  return { id: row.id, name: row.name, email: row.email };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Deduplicated per request, so a layout and its page can both call it.
export const getOwnedAssistant = cache(async (id: string) => {
  const user = await requireUser();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) notFound();
  const [assistant] = await db
    .select()
    .from(assistants)
    .where(and(eq(assistants.id, id), eq(assistants.ownerId, user.id)))
    .limit(1);
  if (!assistant) notFound();
  return assistant;
});

export interface AssistantSummary {
  id: string;
  name: string;
  tier: "free" | "premium";
  slug: string | null;
  createdAt: Date;
  documents: number;
  conversations: number;
  calls: number;
  lastActivity: Date | null;
}

export async function getAssistantSummaries(userId: string): Promise<AssistantSummary[]> {
  const list = await db
    .select()
    .from(assistants)
    .where(eq(assistants.ownerId, userId))
    .orderBy(desc(assistants.createdAt));
  if (list.length === 0) return [];
  const ids = list.map((a) => a.id);

  const [docRows, convRows] = await Promise.all([
    db
      .select({ assistantId: documents.assistantId, n: count() })
      .from(documents)
      .where(inArray(documents.assistantId, ids))
      .groupBy(documents.assistantId),
    db
      .select({
        assistantId: conversations.assistantId,
        channel: conversations.channel,
        n: count(),
        last: max(conversations.createdAt),
      })
      .from(conversations)
      .where(inArray(conversations.assistantId, ids))
      .groupBy(conversations.assistantId, conversations.channel),
  ]);

  return list.map((a) => {
    const convs = convRows.filter((r) => r.assistantId === a.id);
    const last = convs.map((r) => r.last).filter((d): d is Date => d !== null);
    return {
      id: a.id,
      name: a.name,
      tier: a.tier,
      slug: a.slug,
      createdAt: a.createdAt,
      documents: docRows.find((r) => r.assistantId === a.id)?.n ?? 0,
      conversations: convs.reduce((sum, r) => sum + r.n, 0),
      calls: convs.find((r) => r.channel === "phone")?.n ?? 0,
      lastActivity: last.length ? new Date(Math.max(...last.map((d) => d.getTime()))) : null,
    };
  });
}

export async function getDailyActivity(assistantIds: string[], days = 14) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const rows = assistantIds.length
    ? await db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${conversations.createdAt}), 'YYYY-MM-DD')`,
          n: count(),
        })
        .from(conversations)
        .where(and(inArray(conversations.assistantId, assistantIds), gte(conversations.createdAt, since)))
        .groupBy(sql`date_trunc('day', ${conversations.createdAt})`)
    : [];

  const byDay = new Map(rows.map((r) => [r.day, r.n]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { day: key, n: byDay.get(key) ?? 0 };
  });
}

export interface ConversationItem {
  id: string;
  assistantId: string;
  assistantName: string;
  channel: Channel;
  callerIdentifier: string | null;
  createdAt: Date;
  msgs: { id: string; role: "user" | "assistant"; content: string }[];
}

export async function getConversations(opts: {
  assistantIds: string[];
  channel?: Channel;
  search?: string;
  since?: Date;
  limit?: number;
}): Promise<ConversationItem[]> {
  if (opts.assistantIds.length === 0) return [];

  // Escape LIKE wildcards so a search for "50%" matches literally.
  const pattern = opts.search ? `%${opts.search.replace(/[\\%_]/g, (c) => "\\" + c)}%` : null;

  const rows = await db
    .select({
      id: conversations.id,
      assistantId: conversations.assistantId,
      assistantName: assistants.name,
      channel: conversations.channel,
      callerIdentifier: conversations.callerIdentifier,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(assistants, eq(assistants.id, conversations.assistantId))
    .where(
      and(
        inArray(conversations.assistantId, opts.assistantIds),
        opts.channel ? eq(conversations.channel, opts.channel) : undefined,
        opts.since ? gte(conversations.createdAt, opts.since) : undefined,
        pattern
          ? sql`exists (select 1 from messages m where m.conversation_id = ${conversations.id} and m.content ilike ${pattern})`
          : undefined
      )
    )
    .orderBy(desc(conversations.createdAt))
    .limit(opts.limit ?? 50);
  if (rows.length === 0) return [];

  const msgRows = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      role: messages.role,
      content: messages.content,
    })
    .from(messages)
    .where(inArray(messages.conversationId, rows.map((r) => r.id)))
    .orderBy(asc(messages.createdAt));

  const grouped = new Map<string, ConversationItem["msgs"]>();
  for (const m of msgRows) {
    const list = grouped.get(m.conversationId) ?? [];
    list.push({ id: m.id, role: m.role, content: m.content });
    grouped.set(m.conversationId, list);
  }
  return rows.map((r) => ({ ...r, msgs: grouped.get(r.id) ?? [] })).filter((r) => r.msgs.length > 0);
}

export async function getAssistantStats(assistantId: string) {
  const [[docs], [sections], convRows] = await Promise.all([
    db.select({ n: count() }).from(documents).where(eq(documents.assistantId, assistantId)),
    db.select({ n: count() }).from(chunks).where(eq(chunks.assistantId, assistantId)),
    db
      .select({ channel: conversations.channel, n: count(), last: max(conversations.createdAt) })
      .from(conversations)
      .where(eq(conversations.assistantId, assistantId))
      .groupBy(conversations.channel),
  ]);
  const last = convRows.map((r) => r.last).filter((d): d is Date => d !== null);
  return {
    documents: docs.n,
    sections: sections.n,
    conversations: convRows.reduce((sum, r) => sum + r.n, 0),
    calls: convRows.find((r) => r.channel === "phone")?.n ?? 0,
    lastActivity: last.length ? new Date(Math.max(...last.map((d) => d.getTime()))) : null,
  };
}
