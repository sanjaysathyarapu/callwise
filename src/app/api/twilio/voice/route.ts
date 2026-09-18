import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { retrieveContext } from "@/lib/rag/retrieve";
import { rateLimit } from "@/lib/rate-limit";
import twilio from "twilio";
import { z } from "zod";

// Twilio signs the exact public URL it requested, so rebuild it from the
// forwarding headers (the internal req.url differs behind Vercel/ngrok).
function publicUrl(req: Request) {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}${url.pathname}${url.search}`;
}

// Twilio webhook for the premium phone-number tier. Uses Twilio's built-in
// speech recognition (<Gather input="speech">) and TTS (<Say>) so no extra
// STT/TTS vendor is needed — same RAG pipeline as the web chat/voice widgets.
export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return new Response("Twilio is not configured", { status: 503 });

  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });

  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!twilio.validateRequest(authToken, signature, publicUrl(req), params)) {
    return new Response("Invalid signature", { status: 403 });
  }

  const assistantIdParam = new URL(req.url).searchParams.get("assistantId");
  const assistantId = z.string().uuid().safeParse(assistantIdParam).data;
  const speechResult = params.SpeechResult?.slice(0, 1000) || null;

  if (assistantId) {
    const limit = await rateLimit(`phone:assistant:${assistantId}:hour`, 300, 3600);
    if (!limit.ok) {
      return twiml(`<Say>Sorry, we are receiving too many calls right now. Please try again later.</Say>`);
    }
  }

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
    maxOutputTokens: 300,
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
