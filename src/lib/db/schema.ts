import {
  pgTable,
  uuid,
  text,
  timestamp,
  customType,
  pgEnum,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

// pgvector column type — stored as Postgres `vector(1536)` (OpenAI text-embedding-3-small dimension)
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .map((n) => Number(n));
  },
});

export const tierEnum = pgEnum("tier", ["free", "premium"]);
export const channelEnum = pgEnum("channel", ["web_chat", "web_voice", "phone"]);
export const roleEnum = pgEnum("role", ["user", "assistant"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const assistants = pgTable("assistants", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull().default(
    "You are a helpful customer support assistant. Answer using only the provided context. If you don't know, say so and offer to escalate to a human."
  ),
  tier: tierEnum("tier").notNull().default("free"),
  twilioNumber: text("twilio_number"),
  slug: text("slug").unique(),
  greeting: text("greeting"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantId: uuid("assistant_id")
    .notNull()
    .references(() => assistants.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  assistantId: uuid("assistant_id")
    .notNull()
    .references(() => assistants.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantId: uuid("assistant_id")
    .notNull()
    .references(() => assistants.id, { onDelete: "cascade" }),
  channel: channelEnum("channel").notNull(),
  callerIdentifier: text("caller_identifier"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })]
);
