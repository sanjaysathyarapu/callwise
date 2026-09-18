"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const linkClass =
  "rounded px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50";

export function SiteHeader() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
      <nav className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
          Callwise
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/demo" className={linkClass}>
            Demo
          </Link>
          {status === "authenticated" ? (
            <>
              <Link href="/dashboard" className={linkClass}>
                Dashboard
              </Link>
              <span className="hidden px-2 text-sm text-zinc-500 sm:inline">
                {session.user?.name ?? session.user?.email}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Log out
              </button>
            </>
          ) : status === "unauthenticated" ? (
            <>
              <Link href="/login" className={linkClass}>
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
