import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { ChatWidget } from "@/components/ChatWidget";
import { getCurrentUser } from "@/lib/data";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Live demo" };
export const dynamic = "force-dynamic";

const SUGGESTIONS = [
  "How long does standard shipping take?",
  "What is your return policy?",
  "Do hiking boots run true to size?",
  "Is there a promo code for new customers?",
];

async function getDemoAssistant() {
  const [row] = await db
    .select({ id: assistants.id, name: assistants.name })
    .from(assistants)
    .where(eq(assistants.slug, "northwind-demo"))
    .limit(1);
  return row ?? null;
}

export default async function DemoPage() {
  const [assistant, user] = await Promise.all([getDemoAssistant(), getCurrentUser()]);
  const authed = Boolean(user);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Try a Callwise assistant</h1>
        <p className="text-muted-foreground">
          This is <strong className="text-foreground">Northwind Outfitters</strong>, a made-up outdoor gear store. Its assistant only knows
          what the store uploaded: shipping, returns, sizing, warranty and promo details. Ask it anything a shopper would, by typing or with
          the mic.
        </p>
      </header>

      {assistant ? (
        <ChatWidget assistantId={assistant.id} suggestions={SUGGESTIONS} greeting="Hi, I'm Northwind Outfitters support. How can I help you today?" className="h-[32rem]" />
      ) : (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">The demo assistant isn&apos;t set up yet. Please check back soon.</p>
      )}

      <section className="flex flex-col gap-4 border-t pt-8">
        <h2 className="text-lg font-semibold">How a business uses Callwise</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
          <li>Sign up and create an assistant for your business.</li>
          <li>Upload your documents: FAQs, policies, product info.</li>
          <li>Your customers get a chat and voice assistant that answers from those documents.</li>
          <li>Premium: a dedicated phone number, so customers can simply call and talk to the same assistant.</li>
        </ol>
        <Link href={authed ? "/assistants" : "/signup"} className={buttonVariants({ className: "self-start" })}>
          {authed ? "Go to your assistants" : "Create your assistant"}
        </Link>
      </section>
    </div>
  );
}
