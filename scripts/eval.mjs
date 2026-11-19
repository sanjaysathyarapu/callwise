// Retrieval evaluation over the demo knowledge base.
// Usage: node scripts/eval.mjs            (reads DATABASE_URL / OPENAI_API_KEY from .env.local)
//
// For each question in eval/demo-questions.json it embeds the question, runs the same
// pgvector cosine query the app uses (top 5 chunks of the demo assistant) and reports:
//   hit@1     answerable questions whose best chunk comes from the expected document
//   hit@5     answerable questions with the expected document anywhere in the top 5
//   answered  answerable questions where at least one chunk passes the relevance threshold
//   declined  unanswerable questions where NO chunk passes the threshold (the app would say "I don't know")
// The script only reads from the database. Question embeddings are the only OpenAI calls.
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
const sql = neon(env.DATABASE_URL);

// Read the threshold from the app so the evaluation can never drift from it.
const threshold = Number(/MAX_DISTANCE\s*=\s*([0-9.]+)/.exec(fs.readFileSync("src/lib/rag/prompt.ts", "utf8"))[1]);
const questions = JSON.parse(fs.readFileSync("eval/demo-questions.json", "utf8"));
const verbose = process.argv.includes("--verbose");

const [assistant] = await sql`select id from assistants where slug = 'northwind-demo'`;
const { embeddings } = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: questions.map((x) => x.q),
});

const rows = [];
for (let i = 0; i < questions.length; i++) {
  const vec = `[${embeddings[i].join(",")}]`;
  const top = await sql`
    select d.filename, c.embedding <=> ${vec}::vector as distance
    from chunks c join documents d on d.id = c.document_id
    where c.assistant_id = ${assistant.id}
    order by distance asc limit 5`;
  rows.push({ ...questions[i], top: top.map((t) => ({ file: t.filename, d: Number(t.distance) })) });
}

const answerable = rows.filter((r) => r.source);
const unanswerable = rows.filter((r) => !r.source);
const pct = (n, d) => `${n}/${d} (${((100 * n) / d).toFixed(0)}%)`;

const hit1 = answerable.filter((r) => r.top[0]?.file === r.source).length;
const hit5 = answerable.filter((r) => r.top.some((t) => t.file === r.source)).length;
const answered = answerable.filter((r) => r.top[0] && r.top[0].d <= threshold).length;
const declined = unanswerable.filter((r) => !r.top[0] || r.top[0].d > threshold).length;

if (verbose) {
  for (const r of rows) {
    const best = r.top[0];
    console.log(`${r.source ? "A" : "U"} ${best.d.toFixed(3)} ${best.file.padEnd(30)} ${r.source ?? "-"}  | ${r.q}`);
  }
  console.log("");
}
console.log(`chunks retrieved from: ${new Set(rows.flatMap((r) => r.top.map((t) => t.file))).size} documents, threshold ${threshold}`);
console.log(`questions: ${answerable.length} answerable, ${unanswerable.length} unanswerable`);
console.log(`hit@1    ${pct(hit1, answerable.length)}`);
console.log(`hit@5    ${pct(hit5, answerable.length)}`);
console.log(`answered ${pct(answered, answerable.length)}`);
console.log(`declined ${pct(declined, unanswerable.length)}`);
