# Roadmap

Callwise is a portfolio project: a multi-tenant AI customer-support platform where a business uploads its documents and gets a chat, browser-voice and phone assistant that answers only from them. This roadmap tracks the work to finish it as a live, reliable, demonstrable project that shows production engineering practice. It is not a commercial product.

## Definition of done

1. The live site works end to end: sign-up and login, creating an assistant, uploading documents, chat, browser voice, the public `/demo` page, the conversations inbox, and settings.
2. The phone line is off by default and can be switched on for a demo in about ten minutes by following `docs/RUNBOOK.md`.
3. The repository shows production practice: tests, CI, versioned migrations, a vector index, a health check, an uptime check, decision records and a clear README.
4. Every claim in the README is true and defensible. Any before/after numbers come from the evaluation script, not estimates.

## Out of scope

Billing, Stripe, pricing tiers, self-serve phone-number purchase, and features beyond this plan.

## Core set

- [x] **0. Baseline check.** Local production build plus a production smoke test. Found and fixed an expired OpenAI API key that had silently broken chat and document indexing.
- [x] **1. Foundations for testing.** Vitest and a `test` script, unit tests for the chunker, slugs, conversation filters and Twilio helpers, the Twilio helpers extracted into `src/lib/twilio.ts`, an expanded `CLAUDE.md`, and this roadmap. Tests found and fixed three bugs: accented characters split slugs, truncated slugs could contain a double hyphen, and comma-separated forwarded headers made the Twilio signature check throw.
- [x] **2. CI.** GitHub Actions on pushes to `main` and on pull requests: install, lint, typecheck, test, and build with placeholder environment variables. Runs on Linux with Node 22.
- [x] **3. Health endpoint.** `GET /api/health` runs a database round trip and reports which configuration groups are present as booleans, never values. `?deep=1` also makes one real OpenAI call (rate limited), because a configuration-only check cannot tell a present key from an expired one.
- [ ] **4. Phone switch and copy.** Derive whether the phone line is enabled from the environment, replace the "Premium" framing with neutral wording, and show phone setup only when it is enabled.
- [ ] **5. Runbook.** `docs/RUNBOOK.md`: enable the phone for a demo, reseed the demo, rotate secrets, check OpenAI usage and limits, and respond to an uptime alert.
- [ ] **6. Versioned migrations.** Baseline migration generated from the current schema and marked as applied in production, a `db:migrate` script, and the README updated to match.
- [ ] **7. HNSW vector index.** An index on `chunks.embedding` using cosine distance, matching the `<=>` operator, so retrieval stops scanning every row.
- [ ] **8. Atomic ingest.** A document and its chunks are created all-or-nothing, with a test for the failure path.
- [ ] **9. Relevance threshold and prompt hardening.** Discard chunks that are too distant, answer "I don't know" when nothing is relevant, delimit retrieved text as data, and rebuild earlier turns from the database instead of trusting the client.
- [ ] **10. README and decision records.** An architecture diagram, features, local setup, testing, migrations, and decision records for pgvector, session revocation, Twilio `<Gather>` and Postgres-backed rate limiting.

## Remaining items

- [ ] **11. Route tests.** Chat, Twilio webhook and document routes with the database and AI SDK mocked.
- [ ] **12. Uptime workflow.** A scheduled GitHub Action that checks `/demo` and `/api/health` and keeps a single `uptime` issue up to date.
- [ ] **13. Evaluation harness.** About twenty questions over the demo knowledge base, including unanswerable ones, reporting hit@1, hit@5 and how often the assistant correctly declines.
- [ ] **14. Structure-aware chunking.** Split on headings, paragraphs and sentences instead of fixed character offsets; kept only if the evaluation does not regress.
- [ ] **15. Evaluation results in the README.** Honest before and after numbers from items 13 and 14.
- [ ] **16. Background texture.** Settle the opacity of the decorative background, or remove it.
