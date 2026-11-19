# Runbook

Operational steps for the live deployment (https://callwise-three.vercel.app). It assumes you own the Vercel, Neon, OpenAI and Twilio accounts. Commands run from the repository root. Never paste secret values into issues, commits or chat.

Menu names in vendor consoles change. Steps marked **(confirm in console)** were not checked against the live console when this was written; the vendor documentation was checked for everything else.

## Environment variables

| Variable | Required | Used for | If missing or wrong |
|---|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection | Health check `db: fail`; every page that reads data errors |
| `OPENAI_API_KEY` | yes | Embeddings and chat | Chat and uploads fail (502 from `/api/chat`); `/api/health?deep=1` shows `openai: fail` |
| `AUTH_SECRET` | yes | Signs session tokens | Sign-in fails |
| `TWILIO_AUTH_TOKEN` | no | Switches the phone line on and verifies Twilio's request signatures | Webhook answers 503 (unset) or 403 (wrong token) |

Vercel applies a changed variable only to **new** deployments, so after any change you must redeploy (Deployments, the three-dot menu on the latest production deployment, Redeploy, or push a commit). Secret-type variables cannot be read back after saving, so keep the value somewhere safe until it is saved.

## Responding to a failing health check

`GET /api/health` returns booleans and pass/fail only. Open it, then act on what it says:

| Response | Meaning | Action |
|---|---|---|
| Site or endpoint unreachable | Deployment down or Vercel incident | Check the Vercel dashboard and status page. If the latest deploy broke it, roll back (below) |
| `config.<group>: false` | A variable is unset in this deployment | Add it in Vercel, then redeploy |
| `checks.db: fail` | Database unreachable or password changed | Check the Neon console (project status, compute paused or over quota). If the password was reset, update `DATABASE_URL` and redeploy |
| Status 200 but chat returns 502 | Usually an expired or revoked OpenAI key. The plain health check does not call OpenAI | Open `/api/health?deep=1` (limited to 10 per hour per IP). `openai: fail` means rotate the key |
| `?deep=1` returns 429 | Deep probe rate limit | Wait up to an hour |

Roll back a bad deploy: Vercel project, Production Deployment tile, **Instant Rollback**, pick the last good deployment, confirm. Environment variables are not rolled back. After a rollback Vercel stops auto-assigning new pushes to production; use **Manage** on the tile and promote a deployment to resume normal deploys.

## Enable the phone line for a demo

The phone line is off when `TWILIO_AUTH_TOKEN` is unset. About ten minutes:

1. **Twilio account.** A trial account can only receive calls from verified caller IDs, and trial calls play a short notice first. Verify the phone you will call from, or upgrade the account for an audience of unverified callers. **(confirm in console)**
2. **Vercel.** Add `TWILIO_AUTH_TOKEN` (the account's primary Auth Token from the Twilio Console) to Production, then redeploy.
3. **Twilio number.** In the Console open the number, set the voice configuration "A call comes in" to Webhook, HTTP POST, and paste the URL shown on the assistant's **Deploy** tab (it has the form `https://<host>/api/twilio/voice?assistantId=<id>`). The Deploy tab shows the URL only while the phone line is enabled. **(confirm in console)**
4. **Verify.**
   - `/api/health` reports `config.phone: true`.
   - An unsigned request is rejected: `curl -s -o /dev/null -w "%{http_code}" -X POST https://callwise-three.vercel.app/api/twilio/voice` prints `403`.
   - Call the number, ask a question from the demo knowledge base, and check the call appears under Conversations with the phone channel.

Switch it off again: delete `TWILIO_AUTH_TOKEN` from Vercel and redeploy. The webhook then answers 503 and the Deploy tab hides the setup. Browser chat and voice are unaffected.

## Reseed the demo

Restores the fictional Northwind Outfitters knowledge base used by `/demo`.

1. Make sure `.env.local` has `DATABASE_URL` and `OPENAI_API_KEY` for the database you intend to change.
2. Run `node scripts/seed-demo.mjs`. It prints `{assistantId, documents, chunks}`.

It is safe to repeat. The assistant (slug `northwind-demo`) is kept, its system prompt is reset, its documents are deleted and recreated with fresh embeddings, and conversations are untouched. It does not run in a transaction, so if it fails midway (for example the OpenAI key is bad) the demo can be left with fewer documents than before: fix the cause and run it again. It reads `.env.local` from the current directory, so run it from the repo root.

## Rotate secrets

Rotate one at a time and verify before moving on. After each, redeploy and check `/api/health` (and `?deep=1` for OpenAI).

**OpenAI key.** Create a new key in the OpenAI dashboard, set it as `OPENAI_API_KEY` in Vercel (Production) and in `.env.local`, redeploy, open `/api/health?deep=1`, ask the demo a question, and only then delete the old key. **(confirm in console)**

**`AUTH_SECRET`.** Generate with `npx auth secret` (it writes to `.env.local`; copy that value to Vercel). Changing it signs everyone out, because existing session tokens were signed with the old value. Redeploy.

**Neon database password.** In the Neon console open the project, choose the branch, then Roles, reset the password for the role, and copy the new connection string from Connect. The old password stops working for new connections, so update `DATABASE_URL` in Vercel and `.env.local` straight away and redeploy; expect brief database errors until the redeploy finishes. Never point `db:push` at production.

**Twilio Auth Token** (only if the phone line is on). Twilio supports a secondary Auth Token: create it, switch Vercel to it, then promote it. Promoting deletes the old primary immediately, and Twilio emails the account owners about the change.
1. Create a secondary token in the Console (Account, API keys and tokens, Auth Tokens) **(confirm in console)**, or `POST https://accounts.twilio.com/v1/AuthTokens/Secondary`.
2. Promote it (`POST https://accounts.twilio.com/v1/AuthTokens/Promote`), set it as `TWILIO_AUTH_TOKEN` in Vercel, and redeploy.
3. Twilio's rotation page does not say which token signs webhook requests before and after promotion, so expect calls to fail the signature check (403) from promotion until the redeploy is live, and do the two steps back to back. Test with a real call.

## Check OpenAI usage and limits

- Usage and spend are on the OpenAI dashboard (Usage, and Limits for budgets and alerts). Set a monthly budget and an email alert there. **(confirm in console)**
- A key rejected with `401` is expired or deleted; rotate it as above.
- The app caps its own usage so one visitor cannot run up a bill:

| Limit | Value | Where |
|---|---|---|
| Chat per IP | 15 per minute, 100 per hour | `src/app/api/chat/route.ts` |
| Chat per assistant | 300 per hour | same |
| Phone calls per assistant | 300 requests per hour | `src/app/api/twilio/voice/route.ts` |
| Uploads per user | 30 per hour, 25 documents per assistant | `src/app/api/assistants/[id]/documents/route.ts` |
| Question length | 1,000 characters; 12 earlier messages kept | chat route |
| Reply length | 500 tokens web, 300 tokens phone | chat and voice routes |
| Deep health probe | 10 per hour per IP | `src/app/api/health/route.ts` |

Models are `gpt-4o-mini` for answers and `text-embedding-3-small` for embeddings. Counters live in Postgres, so they survive redeploys.

## Rehearsal log

What has been run against production while writing this document:

- Reseed: ran `node scripts/seed-demo.mjs` once. Before and after were identical (7 documents, 7 chunks, same assistant, same system prompt, 10 conversations), and the demo chat answered a returns question correctly afterwards.
- Health check and the unsigned-webhook 403 were confirmed earlier in the project.

Not yet rehearsed by the owner: enabling the phone line from a clean state, and each secret rotation. Do one end-to-end run before relying on these steps in an interview, and correct this file where the console differs.
