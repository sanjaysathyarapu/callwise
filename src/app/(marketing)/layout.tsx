import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth/config";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const authed = Boolean(session?.user);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Callwise
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/demo" className={buttonVariants({ variant: "ghost" })}>
              Demo
            </Link>
            <ThemeToggle />
            {authed ? (
              <Link href="/dashboard" className={buttonVariants()}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
                  Log in
                </Link>
                <Link href="/signup" className={buttonVariants()}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Callwise is a portfolio project. The demo store is fictional.
      </footer>
    </div>
  );
}
