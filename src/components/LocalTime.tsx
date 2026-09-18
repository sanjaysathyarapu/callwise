"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Formats in the viewer's own timezone; renders empty on the server so the two never disagree.
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    () => ""
  );
  return <time dateTime={iso}>{text}</time>;
}
