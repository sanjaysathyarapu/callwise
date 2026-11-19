# 2. Revoke JWT sessions with a per-user version number

Status: accepted

## Context

Sign-in uses Auth.js with stateless JWT sessions, which keeps the app free of a session table and works well on serverless. The cost is that a signed token stays valid until it expires, so "sign out of all devices" and "log everyone out after a password change" cannot be done by deleting a row.

## Decision

Each user has an integer `session_version`. It is copied into the token when the user signs in. `getCurrentUser()` in `src/lib/data` reads the user row on every authorised request and treats the session as invalid when the token's version differs from the stored one. Changing the password or choosing "sign out of all devices" increments the stored version, which invalidates every token issued before.

All server code authorises through `getCurrentUser()` or `requireUser()`, never through the raw `auth()`, so a revoked session cannot slip through a path that skips the check.

## Consequences

- Revocation is immediate and needs one extra indexed read per authorised request, instead of a full session store.
- Tokens remain stateless, so there is nothing to clean up and no sticky sessions.
- Revocation is all-or-nothing per user; there is no way to end a single device's session. That would need a session table, and was judged unnecessary here.
- The rule "never call `auth()` directly" is a convention rather than something the type system enforces, so it is documented in `CLAUDE.md`.
- Rotating `AUTH_SECRET` also signs everyone out, because the tokens were signed with the old secret.
