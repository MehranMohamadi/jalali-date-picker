# Budgetyar Go backend

Serverless Go backend for account-owned cloud snapshots and read-only Remote MCP access.

## Endpoints

- `GET /api/health`: deployment health and configuration status.
- `GET /api/account`: resolve the current account session.
- `POST /api/account`: register, log in, log out, update profile/password, or delete an account.
- `GET /api/sync`: download the authenticated user's snapshot.
- `PUT /api/sync`: upload a snapshot with optimistic version checking.
- `POST /api/mcp`: stateless Streamable HTTP MCP endpoint.
- `GET /api/billing`: authenticated plan catalog, effective plan, subscription and entitlements.
- `POST /api/billing`: opt-in development payment simulator only.

The frontend server authenticates to this backend with `BUDGETYAR_API_TOKEN` and
forwards an opaque account session in `X-Budgetyar-Session`. The backend resolves
the account ID from PostgreSQL for `/api/sync`; browser-provided user IDs are
never trusted. Passwords use Argon2id. Session tokens are stored only as SHA-256
hashes in PostgreSQL. The MCP endpoint remains a separate, bearer-token-only
read-only integration for the configured legacy `BUDGETYAR_USER_ID`.

## Setup

1. Create a pooled PostgreSQL database in Neon or Supabase.
2. Run `migrations/001_initial.sql`, `migrations/002_accounts.sql`, and `migrations/003_billing.sql` in order.
3. Create a separate Vercel project with `backend` as its Root Directory.
4. Add the variables listed in `.env.example` to the Vercel project.
5. Generate `BUDGETYAR_API_TOKEN` with at least 32 random characters.
6. Deploy and use `https://<backend-domain>/api/mcp` as the Remote MCP URL.

`BUDGETYAR_ALLOWED_ORIGIN` must exactly match the frontend origin and must not
end in a slash.

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
