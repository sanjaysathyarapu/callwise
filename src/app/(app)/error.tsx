"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t load this page. Your data is safe. Try again, or go back to your dashboard.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Dashboard
        </Link>
      </div>
    </div>
  );
}
