import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assistants, conversations, messages as messagesTable } from "@/lib/db/schema";
import { retrieveContext } from "@/lib/rag/retrieve";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const MAX_QUESTION_CHARS = 1000;
const MAX_HISTORY_MESSAGES = 12;

const bodySchema = z.object({
  assistantId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  channel: z.enum(["web_chat", "web_voice"]).default("web_chat"),
  messages: z.array(z.custom<UIMessage>()).min(1).max(50),
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textOf(message: UIMessage) {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const [perMinute, perHour] = await Promise.all([
    rateLimit(`chat:ip:${ip}:min`, 15, 60),
    rateLimit(`chat:ip:${ip}:hour`, 100, 3600),
  ]);
  if (!perMinute.ok || !perHour.ok) {
    return tooManyRequests(Math.max(perMinute.retryAfterSeconds, perHour.ok ? 0 : perHour.retryAfterSeconds));
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const { assistantId, conversationId, channel } = parsed.data;
  const history = parsed.data.messages.slice(-MAX_HISTORY_MESSAGES);

  const lastMessage = history[history.length - 1];
  if (lastMessage.role !== "user") return json({ error: "Invalid request" }, 400);
  const question = textOf(lastMessage);
  if (!question.trim()) return json({ error: "Empty message" }, 400);
  if (question.length > MAX_QUESTION_CHARS) {
    return json({ error: `Messages are limited to ${MAX_QUESTION_CHARS} characters.` }, 400);
  }

  const assistantLimit = await rateLimit(`chat:assistant:${assistantId}:hour`, 300, 3600);
  if (!assistantLimit.ok) return tooManyRequests(assistantLimit.retryAfterSeconds);

  const [assistant] = await db
    .select()
    .from(assistants)
    .where(eq(assistants.id, assistantId))
    .limit(1);
  if (!assistant) return json({ error: "Assistant not found" }, 404);

  if (conversationId) {
    await db
      .insert(conversations)
      .values({ id: conversationId, assistantId, channel, callerIdentifier: ip })
      .onConflictDoNothing();
    const [conversation] = await db
      .select({ assistantId: conversations.assistantId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    if (conversation?.assistantId !== assistantId) return json({ error: "Invalid request" }, 400);
    await db.insert(messagesTable).values({ conversationId, role: "user", content: question });
  }

  let context;
  try {
    context = await retrieveContext(assistant.id, question);
  } catch (error) {
    console.error("chat: retrieval failed", error);
    return json({ error: "The assistant is temporarily unavailable. Please try again." }, 502);
  }
  const contextBlock = context.map((c) => `- ${c.content}`).join("\n");

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `${assistant.systemPrompt}\n\nRelevant context:\n${contextBlock || "(no matching documents found)"}`,
    messages: await convertToModelMessages(history),
    maxOutputTokens: 500,
    onError: ({ error }) => console.error("chat: model call failed", error),
    onFinish: async ({ text }) => {
      if (conversationId && text) {
        await db.insert(messagesTable).values({ conversationId, role: "assistant", content: text });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
