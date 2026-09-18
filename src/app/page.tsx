import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-32 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Callwise
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          AI customer support your business can talk to. Train an assistant on
          your docs, drop in a chat or voice widget, and upgrade to a
          dedicated phone number when you&apos;re ready.
        </p>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="rounded bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded border border-zinc-300 px-5 py-2.5 text-sm font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
          >
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
