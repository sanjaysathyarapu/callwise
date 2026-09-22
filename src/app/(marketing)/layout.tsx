import Link from "next/link";
import { BrandScatter } from "@/components/BrandScatter";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/data";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const authed = Boolean(await getCurrentUser());

  return (
    <div className="flex min-h-screen flex-col">
      <BrandScatter />
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" aria-label="Callwise home">
            <Logo />
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
      <footer className="border-t py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground sm:flex-row">
          <p>Callwise is a portfolio project. The demo store is fictional.</p>
          <nav className="flex gap-4" aria-label="Legal">
            <Link href="/demo" className="hover:text-foreground">
              Demo
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
