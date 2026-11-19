# 3. Answer phone calls with Twilio Gather and Say

Status: accepted

## Context

The optional phone line needs speech in and speech out. The options were to stream call audio to a speech-to-text and text-to-speech vendor over WebSockets, or to use Twilio's built-in speech recognition and voice.

## Decision

Use TwiML: `<Gather input="speech">` listens and transcribes, and `<Say>` speaks the reply. Each turn is an HTTP POST to `/api/twilio/voice`, which retrieves context, asks the model and returns the next TwiML. The call's `CallSid` is turned into a deterministic conversation id (`conversationIdFor`), so every turn of a call lands in the same conversation and the last few messages give the model its memory. The webhook rejects requests with an invalid `X-Twilio-Signature` (403) and answers 503 when `TWILIO_AUTH_TOKEN` is not set, which is also how the phone line is switched off.

## Consequences

- No extra vendor, no long-lived connection, and the handler is an ordinary serverless route that shares the retrieval and prompt code with web chat.
- Latency is a full round trip per turn and there is no barge-in or streaming speech; replies feel slower than a streaming voice agent.
- Twilio's recognition and voice quality are good enough for support questions but not tunable.
- Signature verification depends on rebuilding the exact public URL Twilio signed, so the handler reads `x-forwarded-proto` and `x-forwarded-host` (taking the first value when a proxy chain adds several). This was a real bug found by unit tests.
- A live number costs money and needs a Twilio account, so the line is a toggle: it is off unless the auth token is configured, and `docs/RUNBOOK.md` describes turning it on.
