import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";
import { ChatWidget } from "@/components/ChatWidget";

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
  const assistant = await getDemoAssistant();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          &larr; Callwise
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Try a Callwise assistant
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          This is <strong>Northwind Outfitters</strong>, a made-up outdoor gear store. Its
          assistant only knows what the store uploaded: shipping, returns, sizing, warranty and
          promo details. Ask it anything a shopper would, by typing or with the mic.
        </p>
      </header>

      {assistant ? (
        <ChatWidget assistantId={assistant.id} suggestions={SUGGESTIONS} />
      ) : (
        <p className="rounded border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
          The demo assistant isn&apos;t set up yet. Please check back soon.
        </p>
      )}

      <section className="flex flex-col gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          How a business uses Callwise
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Sign up and create an assistant for your business.</li>
          <li>Upload your documents: FAQs, policies, product info.</li>
          <li>Your customers get a chat and voice assistant that answers from those documents.</li>
          <li>
            Premium: a dedicated phone number, so customers can simply call and talk to the
            same assistant.
          </li>
        </ol>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="rounded bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Create your assistant
          </Link>
        </div>
      </section>
    </div>
  );
}
