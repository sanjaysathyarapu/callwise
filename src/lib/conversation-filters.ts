export type ConversationChannel = "phone" | "web_voice" | "web_chat";

export const CHANNEL_FILTERS: { value: ConversationChannel | "all"; label: string }[] = [
  { value: "all", label: "All channels" },
  { value: "phone", label: "Phone" },
  { value: "web_voice", label: "Web voice" },
  { value: "web_chat", label: "Web chat" },
];

export const RANGE_FILTERS = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

export type RangeFilter = (typeof RANGE_FILTERS)[number]["value"];

export const PAGE_SIZE = 25;
export const MAX_LIMIT = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ConversationFilters {
  assistant?: string;
  channel?: ConversationChannel;
  q?: string;
  range: RangeFilter;
  limit: number;
}

export function parseFilters(sp: Record<string, string | undefined>): ConversationFilters {
  const channel = CHANNEL_FILTERS.find((c) => c.value === sp.channel && c.value !== "all")?.value;
  const range = RANGE_FILTERS.find((r) => r.value === sp.range)?.value ?? "all";
  const limit = Math.min(MAX_LIMIT, Math.max(PAGE_SIZE, Number(sp.limit) || PAGE_SIZE));
  return {
    assistant: sp.assistant && UUID.test(sp.assistant) ? sp.assistant : undefined,
    channel: channel as ConversationChannel | undefined,
    q: sp.q?.trim().slice(0, 100) || undefined,
    range,
    limit,
  };
}

export function rangeToSince(range: RangeFilter): Date | undefined {
  if (range === "all") return undefined;
  const days = { "7d": 7, "30d": 30, "90d": 90 }[range];
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
