# Callwise

AI customer support that businesses can train on their own documents. Sign up, create an assistant, upload your docs, and get a chat and voice assistant that answers using only your content. A dedicated phone number is the premium tier.

**Live demo:** https://callwise-three.vercel.app/demo (a fictional outdoor-gear store, no sign-up needed)

## Features

- **Multi-tenant assistants:** each account creates and manages its own assistants; nothing is shared between businesses.
- **Bring your own documents:** upload PDF, Word (.docx), text, Markdown or CSV files, or paste text. Files are parsed, chunked, embedded and stored in Postgres with pgvector.
- **Grounded answers:** each question retrieves the closest chunks and the model answers only from them, and says so when it doesn't know.
- **Streaming chat:** responses stream token by token via the Vercel AI SDK.
- **Voice in the browser:** speech input and spoken replies use the Web Speech API, so voice needs no paid speech vendor. Best supported in Chrome.
- **Phone tier:** a Twilio number routes calls to the same retrieval pipeline. Twilio's built-in speech recognition and text-to-speech handle the audio, calls keep conversation memory across turns, and every call is logged.
- **App shell and dashboard:** a sidebar layout with live stats, a 14-day activity chart, a setup checklist and recent conversations, plus per-assistant Overview, Knowledge, Test, Conversations, Deploy and Settings tabs.
- **Deploy anywhere:** every assistant gets a public chat page, a one-line website chat bubble (`widget.js`) and an iframe embed.
- **Auth:** email and password sign-up with Auth.js (server actions, bcrypt-hashed passwords, rate-limited attempts), session-aware navigation, and protected routes that return you to where you were going.
- **Abuse protection:** Twilio request signatures are verified, chat and uploads are rate limited (Postgres-backed counters), and input, history and output sizes are capped.

## Architecture

```
Browser (chat + mic)
   |  POST /api/chat  (streaming)
   v
Next.js route handler
   |-- embed question (OpenAI text-embedding-3-small)
   |-- pgvector cosine search over the assistant's chunks (Neon Postgres)
   `-- stream answer (gpt-4o-mini) grounded in retrieved context

Twilio call --> POST /api/twilio/voice --> same retrieval + answer path
```

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Database | Postgres + pgvector on Neon, accessed with Drizzle ORM |
| AI | OpenAI embeddings and chat completions via the Vercel AI SDK |
| Auth | Auth.js (NextAuth v5), credentials provider, JWT sessions |
| Voice | Web Speech API (browser); Twilio `<Gather>` / `<Say>` for phone |

### Project layout

```
src/
  app/
    (marketing)/    landing page and public demo
    (auth)/         login and signup (redirect away when logged in)
    (app)/          authenticated app: dashboard, assistants/[id]/*, conversations
    a/[slug]        public chat page for an assistant
    embed/[slug]    embeddable chat used by the chat bubble and iframe
    api/            chat, documents, twilio and auth route handlers
  components/       UI (shadcn/ui on Base UI), chat widget, dashboard pieces
  lib/
    db/             Drizzle schema and client
    rag/            chunking, embedding, retrieval, file text extraction
    auth/           Auth.js config and login/signup server actions
    actions/        server actions for assistants
    data/           dashboard and conversation queries
  proxy.ts          route protection with a return-to-page redirect
public/widget.js    the embeddable chat bubble
```

## Running locally

Requires Node 20+, a Neon Postgres database, and an OpenAI API key.

```bash
npm install
cp .env.example .env.local   # then fill in the values
```

Enable pgvector once in your database, then push the schema:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

```bash
npm run db:push
npm run dev
```

Open http://localhost:3000, create an account, add an assistant, paste in a document, and ask it a question.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `OPENAI_API_KEY` | Embeddings and chat completions |
| `AUTH_SECRET` | Auth.js session signing (`npx auth secret`) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Phone tier (optional for now) |

## Status

Deployed on Vercel with Neon Postgres. Working end to end: sign-up, login, assistant management, file and text indexing, grounded chat with browser voice, and a phone line with call memory. Self-serve number provisioning per business is not built; the phone tier is demonstrated with a single Twilio number.

## Seeding the demo

`node scripts/seed-demo.mjs` creates the fictional "Northwind Outfitters" business and its knowledge base used by the /demo page.
