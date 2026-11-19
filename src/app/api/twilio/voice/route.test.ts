import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import twilio from "twilio";

const { rateLimit, retrieveContext, generateText } = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  retrieveContext: vi.fn(),
  generateText: vi.fn(),
}));
// The query-builder fake is created in a hoisted block so the vi.mock factory can use it.
const fake = await vi.hoisted(async () => {
  const { createDbFake } = await import("@/test/db-fake");
  return createDbFake();
});

vi.mock("@/lib/db", () => ({ db: fake.db }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/rag/retrieve", () => ({ retrieveContext }));
vi.mock("ai", () => ({ generateText }));
vi.mock("@ai-sdk/openai", () => ({ openai: () => "model" }));

import { POST } from "./route";

const TOKEN = "test-auth-token";
const ASSISTANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const URL_ = `https://app.example.com/api/twilio/voice?assistantId=${ASSISTANT}`;

function signedRequest(params: Record<string, string>, opts: { token?: string; url?: string } = {}) {
  const url = opts.url ?? URL_;
  const signature = twilio.getExpectedTwilioSignature(opts.token ?? TOKEN, url, params);
  const u = new URL(url);
  return new Request(url, {
    method: "POST",
    headers: {
      "x-twilio-signature": signature,
      "x-forwarded-proto": u.protocol.replace(":", ""),
      "x-forwarded-host": u.host,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
}

const assistantRow = { id: ASSISTANT, name: "Bob", greeting: null, systemPrompt: "You are Bob." };
const body = async (res: Response) => res.text();

beforeEach(() => {
  vi.stubEnv("TWILIO_AUTH_TOKEN", TOKEN);
  fake.reset();
  rateLimit.mockReset();
  rateLimit.mockResolvedValue({ ok: true, retryAfterSeconds: 1 });
  retrieveContext.mockReset();
  retrieveContext.mockResolvedValue([{ content: "Returns take 60 days.", distance: 0.4 }]);
  generateText.mockReset();
  generateText.mockResolvedValue({ text: "You have 60 days." });
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/twilio/voice", () => {
  it("answers 503 when the phone line is not configured", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    const res = await POST(signedRequest({ CallSid: "CA1" }));
    expect(res.status).toBe(503);
  });

  it("answers 403 for an invalid signature and does no work", async () => {
    const res = await POST(signedRequest({ CallSid: "CA1" }, { token: "wrong-token" }));
    expect(res.status).toBe(403);
    expect(rateLimit).not.toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
  });

  it("answers 403 when the body was altered after signing", async () => {
    const req = signedRequest({ CallSid: "CA1" });
    const tampered = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: new URLSearchParams({ CallSid: "CA1", SpeechResult: "injected" }).toString(),
    });
    expect((await POST(tampered)).status).toBe(403);
  });

  it("greets a first-time caller with a speech Gather", async () => {
    fake.queue([assistantRow], [{ n: 0 }]);
    const res = await POST(signedRequest({ CallSid: "CA1" }));
    const xml = await body(res);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/xml");
    expect(xml).toContain('<Gather input="speech"');
    expect(xml).toContain("Hi, I&apos;m Bob");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("asks the caller to repeat when speech is empty mid-call", async () => {
    fake.queue([assistantRow], [{ n: 2 }]);
    const xml = await body(await POST(signedRequest({ CallSid: "CA1" })));
    expect(xml).toContain("didn&apos;t catch that");
  });

  it("answers with a polite message for an unknown assistant", async () => {
    fake.queue([]);
    const xml = await body(await POST(signedRequest({ CallSid: "CA1" })));
    expect(xml).toContain("not configured correctly");
    expect(xml).not.toContain("<Gather");
  });

  it("stops answering when the per-assistant call limit is reached", async () => {
    rateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });
    const xml = await body(await POST(signedRequest({ CallSid: "CA1", SpeechResult: "hi" })));
    expect(xml).toContain("too many calls");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("answers a spoken question from retrieved context and logs both turns", async () => {
    fake.queue([assistantRow], undefined, [], []);
    const xml = await body(
      await POST(signedRequest({ CallSid: "CA1", SpeechResult: "How long to return?", From: "+15555550100" }))
    );
    expect(xml).toContain("You have 60 days.");
    const system = generateText.mock.calls[0][0].system as string;
    expect(system).toContain("Returns take 60 days.");
    const inserted = fake.inserted();
    expect(inserted).toContainEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "user", content: "How long to return?" }),
        expect.objectContaining({ role: "assistant", content: "You have 60 days." }),
      ])
    );
  });

  it("drops distant chunks so the assistant declines instead of guessing", async () => {
    retrieveContext.mockResolvedValue([{ content: "unrelated", distance: 0.95 }]);
    fake.queue([assistantRow], undefined, [], []);
    await POST(signedRequest({ CallSid: "CA1", SpeechResult: "capital of France?" }));
    const system = generateText.mock.calls[0][0].system as string;
    expect(system).toContain("No relevant information was found");
    expect(system).not.toContain("unrelated");
  });

  it("apologises and keeps the line open when the model call fails", async () => {
    generateText.mockRejectedValue(new Error("openai down"));
    fake.queue([assistantRow], undefined, [], []);
    const xml = await body(await POST(signedRequest({ CallSid: "CA1", SpeechResult: "hello" })));
    expect(xml).toContain("having trouble");
    expect(xml).toContain("<Gather");
  });
});
