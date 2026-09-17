import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { retrieveContext } from "@/lib/rag/retrieve";

export async function POST(req: Request) {
  const { messages, assistantId }: { messages: UIMessage[]; assistantId: string } =
    await req.json();

  const [assistant] = await db
    .select()
    .from(assistants)
    .where(eq(assistants.id, assistantId))
    .limit(1);

  if (!assistant) {
    return new Response("Assistant not found", { status: 404 });
  }

  const lastUserMessage = messages[messages.length - 1];
  const query = lastUserMessage.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join(" ");

  const context = await retrieveContext(assistant.id, query);
  const contextBlock = context.map((c) => `- ${c.content}`).join("\n");

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `${assistant.systemPrompt}\n\nRelevant context:\n${contextBlock || "(no matching documents found)"}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
