import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChatWidget } from "@/components/ChatWidget";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function getBySlug(slug: string) {
  const [row] = await db.select().from(assistants).where(eq(assistants.slug, slug)).limit(1);
  return row ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await getBySlug((await params).slug);
  return { title: a ? `Chat with ${a.name}` : "Assistant not found" };
}

export default async function PublicAssistantPage({ params }: { params: Promise<{ slug: string }> }) {
  const assistant = await getBySlug((await params).slug);
  if (!assistant) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-semibold tracking-tight">{assistant.name}</span>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pb-10">
        <p className="text-sm text-muted-foreground">
          Ask a question by typing or with the microphone. Answers come from {assistant.name}&apos;s own documents.
        </p>
        <ChatWidget
          assistantId={assistant.id}
          greeting={assistant.greeting ?? `Hi, I'm ${assistant.name}. How can I help you today?`}
          className="h-[34rem]"
        />
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <Link href="/" className="font-medium underline underline-offset-4">
          Callwise
        </Link>
      </footer>
    </div>
  );
}
