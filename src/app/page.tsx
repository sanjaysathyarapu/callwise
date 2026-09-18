import Link from "next/link";

const steps = [
  {
    title: "Sign up your business",
    body: "Create an account and set up an assistant in under a minute.",
  },
  {
    title: "Upload what you know",
    body: "Add your FAQs, policies and product details. Callwise indexes them for instant lookup.",
  },
  {
    title: "Customers get answers",
    body: "A chat and voice assistant answers from your documents only, and says so when it doesn't know.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-16 px-6 py-24 text-center">
        <section className="flex flex-col items-center gap-6">
          <h1 className="text-5xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Callwise
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            AI customer support your business can talk to. Train an assistant on your own
            documents, add a chat and voice widget, and upgrade to a dedicated phone number when
            you&apos;re ready.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/demo"
              className="rounded bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Try the live demo
            </Link>
            <Link
              href="/signup"
              className="rounded border border-zinc-300 px-5 py-2.5 text-sm font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
            >
              Create your assistant
            </Link>
            <Link
              href="/login"
              className="px-3 py-2.5 text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="grid w-full gap-4 text-left sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Step {i + 1}
              </p>
              <h2 className="mt-1 font-semibold text-black dark:text-zinc-50">{s.title}</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="flex w-full flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="font-semibold text-black dark:text-zinc-50">Free and Premium</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <strong>Free:</strong> chat and browser voice assistant for your website.{" "}
            <strong>Premium:</strong> everything in Free plus a dedicated phone number, so
            customers can call and talk to your assistant.
          </p>
        </section>
      </main>
    </div>
  );
}
