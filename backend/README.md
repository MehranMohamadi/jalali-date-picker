# Budgetyar Go backend

Serverless Go backend for cloud snapshots and read-only Remote MCP access.

## Endpoints

- `GET /api/health`: deployment health and configuration status.
- `GET /api/sync`: download the authenticated user's snapshot.
- `PUT /api/sync`: upload a snapshot with optimistic version checking.
- `POST /api/mcp`: stateless Streamable HTTP MCP endpoint.

The MCP endpoint exposes only `transactions_list`, `finance_summary`, and
`budgets_list`. All endpoints containing financial data require the same bearer
token.

## Setup

1. Create a pooled PostgreSQL database in Neon or Supabase.
2. Run `migrations/001_initial.sql` in that database.
3. Create a separate Vercel project with `backend` as its Root Directory.
4. Add the variables listed in `.env.example` to the Vercel project.
5. Generate `BUDGETYAR_API_TOKEN` with at least 32 random characters.
6. Deploy and use `https://<backend-domain>/api/mcp` as the Remote MCP URL.

`BUDGETYAR_ALLOWED_ORIGIN` must exactly match the frontend origin and must not
end in a slash.

