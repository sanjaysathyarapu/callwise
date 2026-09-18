# Callwise

AI customer support that businesses can train on their own documents. Sign up, create an assistant, upload your docs, and get a chat and voice widget that answers using only your content. A dedicated phone number is planned as a premium tier.

## Features

- **Multi-tenant assistants:** each account creates and manages its own assistants.
- **Retrieval-augmented answers:** uploaded documents are chunked, embedded, and stored in Postgres with pgvector. Each question retrieves the closest chunks and the model answers from them.
- **Streaming chat:** responses stream token by token via the Vercel AI SDK.
- **Voice in the browser:** speech input and spoken replies use the Web Speech API, so voice needs no paid speech vendor. Best supported in Chrome.
- **Auth:** email and password sign-up and login with Auth.js, bcrypt-hashed passwords, and protected dashboard routes.
- **Phone tier (in progress):** a Twilio webhook (`/api/twilio/voice`) reuses the same retrieval pipeline. It is written but not yet tested against a live Twilio number.

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
| Framework | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Database | Postgres + pgvector on Neon, accessed with Drizzle ORM |
| AI | OpenAI embeddings and chat completions via the Vercel AI SDK |
| Auth | Auth.js (NextAuth v5), credentials provider, JWT sessions |
| Voice | Web Speech API (browser); Twilio `<Gather>` / `<Say>` for phone |

### Project layout

```
src/
  app/
    api/            chat, signup, assistants, documents, twilio, auth routes
    dashboard/      assistant list and per-assistant knowledge base + chat
    login/ signup/  auth pages
  components/       ChatWidget, DocumentUpload, CreateAssistantForm
  lib/
    db/             Drizzle schema and client
    rag/            chunking, embedding, retrieval
    auth/           Auth.js config (edge-safe split for the proxy)
  proxy.ts          route protection for /dashboard
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

Working end to end: sign-up, login, assistant creation, document indexing, and grounded chat with browser voice. Still to do: Twilio signature validation and live testing, rate limiting, and Vercel deployment.
