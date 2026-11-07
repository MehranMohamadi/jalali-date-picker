# Budgetyar Go backend

Serverless Go backend for account-owned cloud snapshots and account-scoped Remote MCP access.

## Endpoints

- `GET /api/health`: deployment health and configuration status.
- `GET /api/account`: resolve the current account session.
- `POST /api/account`: account actions and session-authenticated MCP key create/list/revoke actions.
- `GET /api/sync`: download the authenticated user's snapshot.
- `PUT /api/sync`: upload a snapshot with optimistic version checking.
- `POST /api/mcp`: stateless Streamable HTTP MCP endpoint.
- `GET /api/billing`: authenticated plan catalog, effective plan, subscription and entitlements.
- `POST /api/billing`: opt-in development payment simulator only.

The frontend server authenticates to this backend with `BUDGETYAR_API_TOKEN` and
forwards an opaque account session in `X-Budgetyar-Session`. The backend resolves
the account ID from PostgreSQL for `/api/sync`; browser-provided user IDs are
never trusted. Passwords use Argon2id. Session tokens are stored only as SHA-256
hashes in PostgreSQL. `/api/mcp` accepts only per-account `bymcp_` bearer keys,
stored as SHA-256 hashes with read/write scope, expiry and revocation. It never
accepts the frontend service token or a browser-selected account ID. The old
`BUDGETYAR_USER_ID` integration is retired. Existing frontend account/sync authentication is unchanged.

## Setup

1. Create a pooled PostgreSQL database in Neon or Supabase.
2. Run migrations `001_initial.sql` through `004_mcp_tokens.sql` in numeric order.
3. Create a separate Vercel project with `backend` as its Root Directory.
4. Add the variables listed in `.env.example` to the Vercel project.
5. Generate `BUDGETYAR_API_TOKEN` with at least 32 random characters.
6. Deploy and use `https://<backend-domain>/api/mcp` as the Remote MCP URL.

`BUDGETYAR_ALLOWED_ORIGIN` must exactly match the frontend origin and must not
end in a slash.

## Codex integration

See [the complete setup guide](../docs/codex-plugin.md) for deployment prerequisites,
account key creation, encrypted Windows credential setup, local plugin installation
and direct MCP configuration. No OpenAI API key is required for this integration.

MCP tools: `finance_snapshot_get`, `budgets_update`, `categories_create`,
`categories_update`, `transactions_update`, plus the existing read helpers.
Writes require `expectedVersion` and use the same transactional optimistic lock
as `/api/sync`. Entire batches succeed or fail together. Unknown JSON fields are
preserved; derived `summary` and `exportedAt` caches are removed on writes.

Key management uses POST `/api/account` with the normal service token and account
session, through the same-origin frontend proxy:

- `mcp_tokens_list`: returns active keys' metadata, never their secrets/hashes.
- `mcp_token_create`: `tokenName` (1–80 characters), `canWrite` (boolean),
  `expiresDays` (1–365). Returns `token` metadata and `secret` once.
- `mcp_token_revoke`: `tokenId`; deletion is scoped to the current account.

Token expiry/revocation is checked on every HTTP request. Revocation prevents new
requests; an already authenticated in-flight write may finish. Account deletion
cascades to its keys. Ordinary logout/password change does not revoke independent
MCP keys; revoke them in Settings when needed. Audit logs record key IDs and write
counts/versions, not keys or financial payloads. There is no OAuth flow or public
directory submission in this local/desktop plugin; `codex mcp login` is not used.

## Billing development

The existing features remain available to free accounts. The Pro catalog entry has no real price,
term, or exclusive features yet. `/api/billing` derives the effective plan from the
server-side subscription; expiry returns the free plan without deleting user data.

The payment simulator is enabled only when `BUDGETYAR_ENABLE_TEST_PAYMENTS=1`,
`BUDGETYAR_TEST_PRICE` (positive integer), `BUDGETYAR_TEST_CURRENCY` (three uppercase
letters), and `BUDGETYAR_TEST_DURATION_DAYS` (1–366) are all set on a non-production
backend. It is disabled when `VERCEL_ENV=production` or `GO_ENV=production`.
The frontend server proxies the backend with its private bearer token and HttpOnly
account session. The simulator is for testing only: its confirmation action models
a verified provider response and must never be enabled in production.

For a real provider, implement `PaymentProvider` in `pkg/platform/billing.go`, keep
credentials on the backend, and create a provider-specific callback route. The
callback must authenticate with the provider's signature or server-to-server verification
before applying the account-owned, idempotent payment transition. Configure the approved
price, currency, term, cancellation rule, and Pro entitlements before checkout is enabled.
Analytics can later instrument page view, upgrade click, payment start/result, and activation.
