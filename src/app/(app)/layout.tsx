import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/app/MobileNav";
import { SidebarNav } from "@/components/app/SidebarNav";
import { UserMenu } from "@/components/app/UserMenu";
import { requireUser } from "@/lib/data";

// Everything under (app) requires a session; requireUser() redirects to /login otherwise.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r bg-card px-3 py-5 md:flex">
        <Link href="/dashboard" className="px-3 text-lg font-semibold tracking-tight">
          Callwise
        </Link>
        <SidebarNav />
        <div className="mt-auto flex flex-col gap-1 px-3 text-xs text-muted-foreground">
          <Link href="/demo" className="hover:text-foreground">
            View public demo
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b px-4 md:px-8">
          <div className="flex items-center gap-2">
            <MobileNav />
            <Link href="/dashboard" className="font-semibold tracking-tight md:hidden">
              Callwise
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu name={user.name ?? "Account"} email={user.email ?? ""} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
