"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { slug: "", label: "Overview" },
  { slug: "/knowledge", label: "Knowledge" },
  { slug: "/test", label: "Test" },
  { slug: "/conversations", label: "Conversations" },
  { slug: "/deploy", label: "Deploy" },
  { slug: "/settings", label: "Settings" },
];

export function AssistantTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/assistants/${id}`;

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b" aria-label="Assistant sections">
      {tabs.map((t) => {
        const href = base + t.slug;
        const active = t.slug === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={t.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
