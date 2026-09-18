// Seeds the public demo business ("Northwind Outfitters", a fictional store).
// Usage: node scripts/seed-demo.mjs   (reads DATABASE_URL / OPENAI_API_KEY from .env.local)
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").trim().split("\n").map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1).trim()];
  })
);
process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
const sql = neon(env.DATABASE_URL);

const DEMO_EMAIL = "demo@callwise.dev";
const NAME = "Northwind Outfitters";
const SYSTEM_PROMPT = `You are the customer support voice and chat assistant for Northwind Outfitters, an online outdoor gear store. Answer using only the provided context. Keep replies short, friendly and easy to say out loud: two or three sentences, no lists or markdown. If the answer is not in the context, say you are not sure and offer to connect the customer with a human agent at support@northwindoutfitters.example.`;

const docs = [
  {
    filename: "shipping.txt",
    content: `Shipping at Northwind Outfitters. Orders placed before 2 PM Pacific time on a business day ship the same day; later orders ship the next business day. Standard shipping takes 3 to 5 business days and costs $6.95, and it is free on orders of $75 or more. Expedited shipping takes 2 business days and costs $14.95. Overnight shipping arrives the next business day and costs $29.95; overnight orders must be placed before noon Pacific. We ship to all 50 US states and to Canada. Canadian orders take 7 to 10 business days and duties are collected at delivery. We do not currently ship to PO boxes for expedited or overnight orders. Oversized items such as kayaks and large tents ship by freight and take 5 to 8 business days; freight delivery is a flat $49.`,
  },
  {
    filename: "returns.txt",
    content: `Returns and exchanges. You can return any unused item in its original packaging within 60 days of delivery for a full refund to your original payment method. Returns are free for exchanges and for defective items. For other returns, a $5.95 return label fee is deducted from your refund. Start a return at northwindoutfitters.example/returns or by contacting support with your order number. Refunds are issued within 5 business days after we receive the item. Final sale items, gift cards, and used sleeping bags or hydration bladders cannot be returned for hygiene reasons. If an item arrives damaged, contact us within 14 days with a photo and we will send a replacement at no cost.`,
  },
  {
    filename: "orders-and-tracking.txt",
    content: `Orders, tracking and cancellations. Once your order ships you receive an email with a tracking link. You can also track orders by signing in and choosing My Orders. You can cancel or change an order within 1 hour of placing it; after that it may already be in the warehouse, and you would need to return it once it arrives. To change a shipping address, contact support right away with your order number. If a package shows as delivered but you cannot find it, wait 24 hours, check with neighbors, then contact us and we will open a carrier investigation. Lost packages are replaced or refunded after the investigation, which takes up to 7 business days.`,
  },
  {
    filename: "sizing-and-fit.txt",
    content: `Sizing and fit. Our jackets and fleeces run true to size with a slightly relaxed fit, so size down if you prefer a trimmer look. Hiking boots run half a size small; we recommend ordering a half size up, and wearing the socks you plan to hike in. Base layers are designed to fit snugly against the skin. Backpacks are sized by torso length rather than height: measure from the bony bump at the base of your neck down to the top of your hip bones. Small fits torsos 15 to 17.5 inches, medium fits 18 to 19.5 inches, and large fits 20 inches and up. Every product page has a size chart, and exchanges for sizing are always free within 60 days.`,
  },
  {
    filename: "warranty-and-care.txt",
    content: `Warranty and product care. All Northwind branded gear carries a lifetime warranty against defects in materials and workmanship. This does not cover normal wear and tear, accidents, or damage from misuse. To make a warranty claim, email support with your order number and photos of the problem. We will repair, replace or refund the item at our discretion. To care for waterproof jackets, wash them with a technical wash and tumble dry on low heat to restore the water repellent finish. Never use fabric softener on waterproof or down items. Store sleeping bags loose in a large cotton sack, not compressed, to keep the insulation lofty.`,
  },
  {
    filename: "payments-and-promotions.txt",
    content: `Payments and promotions. We accept Visa, Mastercard, American Express, Discover, PayPal, Apple Pay and Google Pay. Your card is charged when the order ships, not when you place it. New customers get 10 percent off their first order with the code TRAILHEAD10, valid for 30 days after signing up for our email list. Promo codes cannot be combined, and they do not apply to gift cards or to items marked final sale. Our price match promise covers identical items from authorized retailers within 14 days of purchase. Our Summit Rewards program gives 1 point per dollar spent, and 500 points equals a $10 reward. Points expire after 12 months without a purchase.`,
  },
  {
    filename: "contact-and-hours.txt",
    content: `Contact and hours. Our support team is available Monday through Friday from 8 AM to 6 PM Pacific time and Saturday from 9 AM to 3 PM Pacific. We are closed on Sundays and on major US holidays. You can reach support by email at support@northwindoutfitters.example, by live chat on our website, or by phone at 1-800-555-0142 during business hours. Email replies usually arrive within one business day. Our flagship store is in Portland, Oregon, and is open daily from 10 AM to 7 PM for in-person shopping, gear rentals and free tent setup demos.`,
  },
];

function chunkText(text, size = 800, overlap = 150) {
  const out = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    out.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = end - overlap;
  }
  return out.filter(Boolean);
}

let [user] = await sql`select id from users where email = ${DEMO_EMAIL}`;
if (!user) {
  const hash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  [user] = await sql`insert into users (email, password_hash, name) values (${DEMO_EMAIL}, ${hash}, 'Callwise Demo') returning id`;
}

let [assistant] = await sql`select id from assistants where slug = 'northwind-demo'`;
if (assistant) {
  await sql`update assistants set system_prompt = ${SYSTEM_PROMPT} where id = ${assistant.id}`;
  await sql`delete from documents where assistant_id = ${assistant.id}`;
} else {
  [assistant] = await sql`insert into assistants (owner_id, name, system_prompt, slug) values (${user.id}, ${NAME}, ${SYSTEM_PROMPT}, 'northwind-demo') returning id`;
}

let total = 0;
for (const d of docs) {
  const [doc] = await sql`insert into documents (assistant_id, filename, content) values (${assistant.id}, ${d.filename}, ${d.content}) returning id`;
  const pieces = chunkText(d.content);
  const { embeddings } = await embedMany({ model: openai.embedding("text-embedding-3-small"), values: pieces });
  for (let i = 0; i < pieces.length; i++) {
    const vec = `[${embeddings[i].join(",")}]`;
    await sql`insert into chunks (document_id, assistant_id, content, embedding) values (${doc.id}, ${assistant.id}, ${pieces[i]}, ${vec}::vector)`;
    total++;
  }
}
console.log(JSON.stringify({ assistantId: assistant.id, documents: docs.length, chunks: total }));
