import crypto from "crypto";

// One stable conversation per call, so every webhook turn of a call shares history.
export function conversationIdFor(callSid: string, assistantId: string) {
  const h = crypto.createHash("sha1").update(`${assistantId}:${callSid}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Twilio signs the exact public URL it requested, so rebuild it from the
// forwarding headers (the internal req.url differs behind Vercel/ngrok).
export function publicUrl(req: Request) {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}${url.pathname}${url.search}`;
}

export function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string)
  );
}
