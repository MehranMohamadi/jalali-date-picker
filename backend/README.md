# Budgetyar Go backend

Serverless Go backend for account-owned cloud snapshots and read-only Remote MCP access.

## Endpoints

- `GET /api/health`: deployment health and configuration status.
- `GET /api/account`: resolve the current account session.
- `POST /api/account`: register, log in, log out, update profile/password, or delete an account.
- `GET /api/sync`: download the authenticated user's snapshot.
- `PUT /api/sync`: upload a snapshot with optimistic version checking.
- `POST /api/mcp`: stateless Streamable HTTP MCP endpoint.

The frontend server authenticates to this backend with `BUDGETYAR_API_TOKEN` and
forwards an opaque account session in `X-Budgetyar-Session`. The backend resolves
the account ID from PostgreSQL for `/api/sync`; browser-provided user IDs are
never trusted. Passwords use Argon2id. Session tokens are stored only as SHA-256
hashes in PostgreSQL. The MCP endpoint remains a separate, bearer-token-only
read-only integration for the configured legacy `BUDGETYAR_USER_ID`.

## Setup

1. Create a pooled PostgreSQL database in Neon or Supabase.
2. Run `migrations/001_initial.sql` and `migrations/002_accounts.sql` in order.
3. Create a separate Vercel project with `backend` as its Root Directory.
4. Add the variables listed in `.env.example` to the Vercel project.
5. Generate `BUDGETYAR_API_TOKEN` with at least 32 random characters.
6. Deploy and use `https://<backend-domain>/api/mcp` as the Remote MCP URL.

`BUDGETYAR_ALLOWED_ORIGIN` must exactly match the frontend origin and must not
end in a slash.
