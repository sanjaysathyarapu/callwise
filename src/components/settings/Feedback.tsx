"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { AccountState } from "@/lib/actions/account";

// Inline error text plus a success toast, driven by a server action's result.
export function Feedback({ state }: { state: AccountState }) {
  useEffect(() => {
    if (state?.ok && state.message) toast.success(state.message);
  }, [state]);

  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {state.error}
    </p>
  );
}
