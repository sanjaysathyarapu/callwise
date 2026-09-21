import Link from "next/link";
import { Logo } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">We can&apos;t find that page</h1>
        <p className="max-w-md text-muted-foreground">
          The link may be broken, or the page may have been removed.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className={buttonVariants()}>
          Go home
        </Link>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Dashboard
        </Link>
      </div>
    </div>
  );
}
