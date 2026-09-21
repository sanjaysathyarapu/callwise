import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-6", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <path
        d="M9 11.5A2.5 2.5 0 0 1 11.5 9h9a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5H15l-4 3.5V20h-.5A2.5 2.5 0 0 1 9 17.5z"
        className="fill-background"
      />
      <path d="M13 13.5v3M16 12v6M19 13.5v3" className="stroke-foreground" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">Callwise</span>
    </span>
  );
}
