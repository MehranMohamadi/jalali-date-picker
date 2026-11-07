# Budgetyar plugin for Codex

The plugin reads the complete financial JSON of one connected **cloud account**
and updates budgets, category metadata and existing transactions. Device-only
localStorage is not accessible. Full JSON includes private transaction details;
this is separate from the aggregate-only financial-advice endpoint.

## 1. Deploy the application changes

1. Apply `backend/migrations/004_mcp_tokens.sql` to the existing PostgreSQL database
   after migrations 001–003. It adds a table; it does not rewrite snapshots.
2. Deploy the Go backend with `backend/` as the Vercel project root.
3. Deploy the frontend with its existing `BUDGETYAR_BACKEND_URL` and server-only
   `BUDGETYAR_API_TOKEN` configuration. Build using `npm run build:vercel`.
4. Keep the backend URL: `https://YOUR-BACKEND.vercel.app/api/mcp`.

No deployment or production migration is performed by creating these source files.
Do not use the frontend service token as a Codex credential.

## 2. Create an account key

In Budgetyar, log in to the intended account, open Settings, and upload device
data to cloud storage if it has not been uploaded yet. Under the Codex connection
panel, name the connection, choose expiry and enable editing if desired. Create
and copy the key. Its plaintext is displayed once and is never stored in browser
storage. Read-only keys cannot call write tools successfully.

You can revoke individual keys from this panel. A lost key cannot be recovered;
create a replacement. Re-run configuration when a key expires or is replaced.

## 3. Configure credentials on Windows

Requires Node.js 20+ and PowerShell. From the repository root, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\plugins\budgetyar\scripts\configure.ps1 -McpUrl 'https://YOUR-BACKEND.vercel.app/api/mcp'
```

Paste the account MCP key into the hidden prompt. The helper writes the URL and
a Windows DPAPI-encrypted key to `%LOCALAPPDATA%\Budgetyar\Codex\connection.json`,
outside the repository. The bridge decrypts it under the same Windows user;
neither the key nor a password goes into the plugin manifest or Codex config.
Do not share the credential file. Windows user encryption does not protect against
other programs already running as that user. Remove the file to disconnect this
machine; revoke the key in Budgetyar to disable it everywhere.

Alternatively, on any platform, supply both `BUDGETYAR_MCP_URL` and
`BUDGETYAR_MCP_TOKEN` in the process environment that launches Codex. These override
the Windows credential file. Do not commit or paste real keys into chat/logs.

## 4. Connect to Codex

Choose **one** route to avoid registering duplicate tool sets.

### Install the plugin in the desktop application

This repository contains `.agents/plugins/marketplace.json` pointing to
`plugins/budgetyar`. It packages the MCP bridge and a finance workflow skill.

1. Open this trusted project in Codex in the desktop application.
2. Restart the application, open the Plugins Directory, select the **Budgetyar**
   local source, and install/enable **budgetyar**.
3. Start a new conversation in this project and ask it to read your Budgetyar
   cloud data. Review the first tool call and verify the account data is yours.

If the source is not listed, register the repository marketplace from its root:

```powershell
codex plugin marketplace add .
```

Restart the desktop application and install the plugin from that source. Local
marketplace support varies by client/version; use direct MCP below if unavailable.
After changing plugin files, refresh/reinstall the local plugin and restart so
the installed cached copy is updated. Node must be on the desktop application's PATH.

### Connect directly through Codex CLI

After credential setup, from the repository root:

```powershell
$bridgePath = (Resolve-Path .\plugins\budgetyar\scripts\mcp-bridge.mjs).Path
codex mcp add budgetyar -- node $bridgePath
codex mcp list
codex
```

The absolute path handles spaces in Windows usernames. Start a new Codex session
after registration. This route supplies the same tools without installing the
bundled workflow skill. To disconnect this registration: `codex mcp remove budgetyar`.
Do not run `codex mcp login budgetyar`: these are account keys, not OAuth credentials.

For a remote HTTP connection without the bridge, set the account key in the
launch environment and use:

```powershell
codex mcp add budgetyar --url 'https://YOUR-BACKEND.vercel.app/api/mcp' --bearer-token-env-var BUDGETYAR_MCP_TOKEN
```

This route requires the key environment variable on every launch; it cannot
read the Windows encrypted credential file.

## Tools and write contract

| Tool | Arguments / behavior |
| --- | --- |
| `finance_snapshot_get` | No arguments; returns `version`, `updatedAt`, and complete `data`. |
| `budgets_update` | `expectedVersion`, `changes: [{category, budget}]`; upserts specified category budgets, integer toman >= 0. |
| `categories_create` | `expectedVersion`, `changes: [{key, label, icon?, color?}]`; stable ASCII keys, unique labels; defaults folder / #64748b. |
| `categories_update` | Same shape; existing `key`, optional label/icon/color. Keys stay unchanged. |
| `transactions_update` | `expectedVersion`, `changes: [{id, ...fields}]`; patches existing records. |
| `transactions_list`, `finance_summary`, `budgets_list` | Optional smaller read helpers. Full saved fields are available in `finance_snapshot_get`. |

All writes accept 1–100 changes and require a write-enabled key. `expectedVersion`
is the **outer storage version**, not `data.version` (the snapshot format version).
Pass the returned version to subsequent writes. If another device or agent saved
first, the entire write fails: read the snapshot again, review the intended changes,
and retry only if still appropriate. No automatic last-writer overwrite occurs.

Transaction patches support type, title, amount, date, category, categories, tags,
description, paymentMethod, isEssential, isLoan and loanPerson. Amounts are positive
safe integers in toman; dates are validated Jalali `YYYY/MM/DD`. IDs, source IDs
and ledger metadata remain unchanged. Categories and tags must already exist.
Setting category alone replaces category assignments; use categories for a full
multi-category list. Type income removes category/tag assignments. Other omitted
fields stay unchanged. Category keys are immutable; rename by changing label.

Credit settlement amount/type/date/payment method and installment payment
type/date must be changed in Budgetyar, where their ledger rules are enforced.
These tools do not create/delete transactions, delete categories or alter recurring
definitions, debts, installments, subscriptions or other finance structures.
Those fields remain available in the full JSON and are preserved during edits.
Cached summary/exportedAt are removed on writes; the app computes current totals.

Example tool arguments (using actual keys/IDs and the version just read):

```json
{"expectedVersion":12,"changes":[{"category":"food","budget":3000000}]}
```

```json
{"expectedVersion":13,"changes":[{"id":1700000000000,"category":"transport","description":"Taxi"}]}
```

After Codex edits, use **Download cloud data** in Budgetyar Settings to apply the
cloud version to the device. Back up unsynced device edits first. Cloud sync's
version check prevents an older device snapshot from silently replacing these edits.

## Troubleshooting and verification

- HTTP 401: missing, expired or revoked account key. Generate/configure a replacement.
- HTTP 503: backend/database unavailable or migration 004 is missing.
- Read-only error: create a new key with editing enabled.
- Missing snapshot: explicitly upload the intended account's device data first.
- Version conflict: reread and review. Do not overwrite the snapshot wholesale.
- Bridge startup error: verify Node, HTTPS URL, encrypted file ownership, or both environment variables.
- The bridge targets this backend's stateless JSON Streamable HTTP transport,
  not a general-purpose SSE or session-based MCP server.

Checks: `npm test`, `npm run build:app`, and `go test ./...` / `go vet ./...`
from `backend/`. Backend MCP tests exercise HTTP calls against an account-scoped
test store; a deployed PostgreSQL/OAuth/public-directory integration is not part
of those tests. No OAuth implementation is included or needed for this setup.

Official references: [MCP servers](https://developers.openai.com/plugins/build/mcp-server),
[plugin packaging/local marketplaces](https://developers.openai.com/plugins/build/plugins),
[desktop stdio plugins](https://developers.openai.com/plugins/deploy/desktop-only),
[Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp).
