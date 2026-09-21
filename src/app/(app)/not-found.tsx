import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          That page doesn&apos;t exist, or it belongs to another account.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants()}>
        Back to dashboard
      </Link>
    </div>
  );
}
