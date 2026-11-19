// One-time helper for a database whose tables already exist (created before migrations
// were introduced, e.g. with `db:push`). It records the baseline migration as applied
// WITHOUT running it, so `npm run db:migrate` treats the database as up to date.
// It touches only drizzle.__drizzle_migrations, never the app tables, and is safe to repeat.
//
// Usage: DATABASE_URL=<target> node scripts/baseline-migration.mjs
// (DATABASE_URL comes from the environment, not .env.local, so the target is explicit.)
import crypto from "node:crypto";
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(url);

const journal = JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8"));
const baseline = journal.entries[0];
if (!baseline || baseline.idx !== 0) {
  console.error("drizzle/meta/_journal.json has no baseline entry");
  process.exit(1);
}
// Same hash drizzle computes: sha256 of the migration file contents.
const hash = crypto
  .createHash("sha256")
  .update(fs.readFileSync(`drizzle/${baseline.tag}.sql`, "utf8"))
  .digest("hex");

// Refuse to run against a database that does not have the app tables yet: there the
// baseline must be applied for real with `npm run db:migrate`.
const [{ present }] = await sql`
  select exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'users') as present`;
if (!present) {
  console.error("No app tables found. Run `npm run db:migrate` to apply the baseline instead.");
  process.exit(1);
}

await sql`create schema if not exists drizzle`;
await sql`create table if not exists drizzle.__drizzle_migrations (
  id serial primary key, hash text not null, created_at bigint)`;
const existing = await sql`
  select 1 from drizzle.__drizzle_migrations where hash = ${hash}`;
if (existing.length > 0) {
  console.log(`Baseline ${baseline.tag} is already recorded; nothing to do.`);
} else {
  await sql`insert into drizzle.__drizzle_migrations (hash, created_at)
            values (${hash}, ${baseline.when})`;
  console.log(`Recorded baseline ${baseline.tag} as applied.`);
}
