import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { assistants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CreateAssistantForm } from "@/components/CreateAssistantForm";

export default async function DashboardPage() {
  const session = await auth();
  const rows = await db
    .select()
    .from(assistants)
    .where(eq(assistants.ownerId, session!.user.id));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Your assistants
      </h1>
      <CreateAssistantForm />
      <ul className="flex flex-col gap-2">
        {rows.map((a) => (
          <li key={a.id}>
            <Link
              href={`/dashboard/${a.id}`}
              className="block rounded border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span className="font-medium text-black dark:text-zinc-50">{a.name}</span>
              <span className="ml-2 text-xs uppercase text-zinc-500">{a.tier}</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-zinc-500">
            No assistants yet — create one above to get started.
          </p>
        )}
      </ul>
    </div>
  );
}
