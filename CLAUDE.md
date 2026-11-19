@AGENTS.md

# Callwise project guide

Callwise is a multi-tenant AI customer-support platform. A business signs up, uploads documents, and gets a chat, browser-voice and phone assistant that answers only from those documents. The finishing plan is in `docs/ROADMAP.md`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` then `tsc --noEmit` (route types must be generated first) |
| `npm test` | Vitest, run once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:generate` | Generate a Drizzle migration from `src/lib/db/schema.ts` |

`npm run db:push` exists but must never be pointed at production; use migrations (see Hard rules).

## Verification checklist

Run all four before every push and report the results. Never call an item done, and never push, if any of them fails:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`

The build must not need runtime secrets (the database client connects lazily). To check that, build with the variables empty: `DATABASE_URL= OPENAI_API_KEY= AUTH_SECRET= TWILIO_AUTH_TOKEN= npm run build`.

## Hard rules

1. **Database changes go to a Neon branch first.** For any migration or index: (a) create a Neon branch of the production database; (b) apply the change there using that branch's `DATABASE_URL`, for that command only; (c) verify it (tables intact, the app works against the branch, `drizzle-kit generate` shows no drift); (d) ask before applying to production. Never run `db:push` against production.
2. **Never commit secrets or `.env*` files**, except `.env.example` with placeholder values. Never print secret values.
3. **Never change Vercel, Twilio, Neon or GitHub settings.** Tell the owner exactly what to change instead.
4. **Never push** if lint, type check, tests or build fail.
5. **Don't add or upgrade dependencies** without saying why.
6. **Don't rewrite working features.** Change only what the task needs. If the scope grows, stop and ask.

## Workflow for each roadmap item

1. Read the relevant code and give a short plan (files, approach, tests). Wait for a "go"; for tiny items one line is enough.
2. Implement it.
3. Run the verification checklist and report pass or fail.
4. Commit to `main` in small, logical commits with conventional messages (`feat:`, `fix:`, `test:`, `docs:`, `ci:`, `refactor:`, `chore:`).
5. Push to `main`. Vercel deploys production automatically; say what to check on the live site.
6. Tick the item in `docs/ROADMAP.md`.

When a test exposes a bug, show the failing test first and fix it in its own `fix:` commit.

## Conventions

**Next.js 16 has breaking changes.** Read the matching guide in `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`).
- Route protection lives in `src/proxy.ts`, not `middleware.ts`.
- Route handler and page `params` / `searchParams` are Promises; `await` them.
- Server actions live in `src/lib/actions/` (login, signup and logout are in `src/lib/auth/actions.ts`); read queries in `src/lib/data/`.

**Auth.** Sessions are JWTs, revocable through `users.session_version`. Always authorize with `getCurrentUser()` / `requireUser()` from `@/lib/data`, never with raw `auth()`, so a revoked session is rejected.

**Database.** Drizzle on Neon over the `neon-http` driver, which has no interactive transactions; use `db.batch` for atomic multi-statement writes. `src/lib/db/index.ts` connects lazily so builds work without `DATABASE_URL`.

**UI.** Tailwind v4 with shadcn components built on Base UI. Style a link as a button with `buttonVariants` on `<Link>` (there is no `asChild`). In browser automation, Base UI buttons need real clicks; scripted `.click()` does not open dialogs.

**Tests.** Colocated `*.test.ts`, importing from `vitest` explicitly (no globals), node environment. Mock the database and the AI SDK at the module boundary. Keep logic that needs testing out of route files and in `src/lib`.

**Forms.** React 19 resets uncontrolled forms after a server action, so echo submitted values back in the action state when an error should keep them.

## Repository map

- `src/app/(marketing)` landing, demo, privacy, terms
- `src/app/(auth)` login and signup (signed-in users are redirected away)
- `src/app/(app)` the authenticated app: dashboard, assistants, conversations, settings
- `src/app/a/[slug]` public chat page; `src/app/embed/[slug]` iframe embed (deliberately unbranded); `public/widget.js` chat-bubble script
- `src/app/api` chat, documents, Twilio webhook, auth, account export
- `src/lib/rag` chunking, embedding, retrieval, file text extraction
- `src/lib/db` schema and client; `src/lib/auth` Auth.js config and login/signup actions
- `scripts/seed-demo.mjs` seeds the fictional demo store (assistant slug `northwind-demo`, which the UI will not let you delete)

## Tooling notes

- **Line endings.** The repo is developed on Windows with `autocrlf`, so "LF will be replaced by CRLF" warnings from git are expected and harmless.
- **vitest is pinned to 3.2.7.** vitest 5 needs `@types/node` >= 22 (the project uses 20), and vitest 4 crashes npm 10.9.8's resolver in this dependency tree (`Cannot read properties of null (reading 'edgesOut')`). Revisit when `@types/node` or npm is upgraded.
- **Phone line.** The Twilio webhook returns 503 when `TWILIO_AUTH_TOKEN` is unset and 403 when the request signature is invalid.
