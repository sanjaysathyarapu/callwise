import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { retrieveContext } from "@/lib/rag/retrieve";

// Twilio webhook for the premium phone-number tier. Uses Twilio's built-in
// speech recognition (<Gather input="speech">) and TTS (<Say>) so no extra
// STT/TTS vendor is needed — same RAG pipeline as the web chat/voice widgets.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const assistantId = url.searchParams.get("assistantId");
  const form = await req.formData();
  const speechResult = form.get("SpeechResult") as string | null;

  const [assistant] = assistantId
    ? await db.select().from(assistants).where(eq(assistants.id, assistantId)).limit(1)
    : [];

  if (!assistant) {
    return twiml(`<Say>Sorry, this assistant is not configured correctly.</Say>`);
  }

  if (!speechResult) {
    return twiml(`
      <Gather input="speech" action="/api/twilio/voice?assistantId=${assistant.id}" speechTimeout="auto">
        <Say>Hi, I'm ${escapeXml(assistant.name)}. How can I help you today?</Say>
      </Gather>
    `);
  }

  const context = await retrieveContext(assistant.id, speechResult);
  const contextBlock = context.map((c) => `- ${c.content}`).join("\n");

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `${assistant.systemPrompt}\n\nRelevant context:\n${contextBlock || "(no matching documents found)"}`,
    prompt: speechResult,
  });

  return twiml(`
    <Gather input="speech" action="/api/twilio/voice?assistantId=${assistant.id}" speechTimeout="auto">
      <Say>${escapeXml(text)}</Say>
    </Gather>
  `);
}

function twiml(inner: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string)
  );
}
