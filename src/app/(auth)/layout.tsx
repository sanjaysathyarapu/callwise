import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data";
import { BrandScatter } from "@/components/BrandScatter";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

// Logged-in users never see the login or signup pages.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <BrandScatter />
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Callwise home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">{children}</main>
    </div>
  );
}
