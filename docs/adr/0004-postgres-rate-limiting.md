# 4. Rate-limit with Postgres counters

Status: accepted

## Context

Chat, uploads, sign-in and the deep health probe call paid or abusable services, so they need limits. The app runs on serverless functions, where in-memory counters are per instance and reset on every cold start, so they do not enforce a real limit.

## Decision

A fixed-window counter in a `rate_limits` table, keyed by a string such as `chat:ip:1.2.3.4:min`. `rateLimit(key, limit, windowSeconds)` does one `insert ... on conflict do update set count = count + 1 returning count` and compares the result to the limit, so the increment and the read are a single atomic statement. Old windows are pruned occasionally. Limits live next to the code they protect, and `docs/RUNBOOK.md` lists them.

## Consequences

- Correct across instances and redeploys using a database the app already has; no Redis to run or pay for.
- Each limited request costs one extra database round trip.
- Fixed windows allow a burst of up to twice the limit across a window boundary. That is acceptable for abuse protection and simpler than a sliding window.
- Client identity comes from `x-forwarded-for`, which the platform sets. Shared IPs share a limit, and a caller who can spoof the header on a non-Vercel deployment could dodge the per-IP limit; per-assistant and per-user limits still apply.
- If traffic ever outgrows Postgres for this, the function is the only place that needs to change.
