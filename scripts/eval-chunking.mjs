// Compares chunking strategies on a longer corpus (eval/handbook/*.md), entirely in memory.
// Usage: node scripts/eval-chunking.mjs     (reads OPENAI_API_KEY from .env.local)
//
// The demo knowledge base is too short to tell chunkers apart (each document fits in one
// chunk), so this uses a fictional ISP handbook whose sections span several chunks.
// For each strategy it chunks the corpus, embeds the chunks, and for every question checks
// whether one of the top-k chunks actually CONTAINS the answer text (a stronger test than
// "right document", because a bad cut can split an answer in two).
//   hit@1 / hit@3   answerable questions whose answer text is in the top 1 / top 3 chunks
//   declined        unanswerable questions with no chunk under the relevance threshold
// Nothing is written to any database. Only OpenAI embedding calls are made.
import fs from "node:fs";
import path from "node:path";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { chunkText, chunkStructured } from "../src/lib/rag/chunk.ts";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;

const threshold = Number(/MAX_DISTANCE\s*=\s*([0-9.]+)/.exec(fs.readFileSync("src/lib/rag/prompt.ts", "utf8"))[1]);
const dir = "eval/handbook";
const docs = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()
  .map((f) => ({ file: f, text: fs.readFileSync(path.join(dir, f), "utf8") }));
const questions = JSON.parse(fs.readFileSync("eval/handbook-questions.json", "utf8"));
const model = openai.embedding("text-embedding-3-small");
const norm = (s) => s.replace(/\s+/g, " ").toLowerCase();

const embed = async (values) => (await embedMany({ model, values })).embeddings;
const cosineDistance = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
};
const qVectors = await embed(questions.map((x) => x.q));

const strategies = {
  "fixed 800/150 (current)": (t) => chunkText(t, 800, 150),
  "structure-aware 800": (t) => chunkStructured(t, 800),
};

const answerable = questions.map((q, i) => ({ ...q, v: qVectors[i] })).filter((x) => x.answer);
const unanswerable = questions.map((q, i) => ({ ...q, v: qVectors[i] })).filter((x) => !x.answer);
const pct = (n, d) => `${n}/${d} (${((100 * n) / d).toFixed(0)}%)`;
const rows = [];

for (const [name, chunker] of Object.entries(strategies)) {
  const chunks = docs.flatMap((d) => chunker(d.text).map((content) => ({ file: d.file, content })));
  const vectors = await embed(chunks.map((c) => c.content));
  const ranked = (v) => chunks.map((c, i) => ({ ...c, d: cosineDistance(v, vectors[i]) })).sort((a, b) => a.d - b.d);

  let hit1 = 0, hit3 = 0, declined = 0;
  for (const q of answerable) {
    const top = ranked(q.v).slice(0, 3);
    const has = (c) => norm(c.content).includes(norm(q.answer));
    if (has(top[0])) hit1++;
    if (top.some(has)) hit3++;
  }
  for (const q of unanswerable) if (ranked(q.v)[0].d > threshold) declined++;

  const sizes = chunks.map((c) => c.content.length);
  const mean = Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length);
  // How many answer texts survive intact inside at least one chunk (an upper bound on hit@k).
  const intact = answerable.filter((q) => chunks.some((c) => norm(c.content).includes(norm(q.answer)))).length;
  rows.push({ name, chunks: chunks.length, mean, max: Math.max(...sizes), intact: pct(intact, answerable.length), hit1: pct(hit1, answerable.length), hit3: pct(hit3, answerable.length), declined: pct(declined, unanswerable.length) });
}

console.log(`corpus: ${docs.length} documents, ${answerable.length} answerable + ${unanswerable.length} unanswerable questions, threshold ${threshold}\n`);
for (const r of rows) {
  console.log(r.name);
  console.log(`  chunks ${r.chunks}, mean ${r.mean} chars, max ${r.max}`);
  console.log(`  answer intact in a chunk ${r.intact}`);
  console.log(`  hit@1    ${r.hit1}`);
  console.log(`  hit@3    ${r.hit3}`);
  console.log(`  declined ${r.declined}\n`);
}
