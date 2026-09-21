import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { ThemeToggle } from "@/components/ThemeToggle";

// Logged-in users never see the login or signup pages.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Callwise
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">{children}</main>
    </div>
  );
}
