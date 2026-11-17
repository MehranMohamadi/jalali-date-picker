# Device storage and backup recovery

The local finance snapshot uses the existing `budgetyar-*-v1` keys listed in
`src/utils/deviceStorage.ts`. The local schema marker is
`budgetyar-device-schema-v1` with value `1`; unmarked legacy data is accepted.
Backups retain `app: "budgetyar"` and `version: 1`. Optional legacy collections
default safely, legacy tags are migrated, and legacy goal balances create one
initial ledger entry. Deleted preset rule IDs are included in backups. Unknown
top-level backup fields survive import/export.

Writes use an undo journal, `budgetyar-device-write-v1`, containing the previous
raw values of changed keys. The journal is saved before any member is changed
and removed only after all writes finish. On failure, rollback is attempted;
startup finishes a pending rollback before reading finance or account settings.
If recovery or validation fails, existing raw records are retained and finance
writes and automatic cloud transfer are blocked. The user can retry reading,
download a raw recovery file, or explicitly replace the data with a valid backup.
The raw recovery file is for diagnosis; it is not a normal importable backup.

File import preserves the previous snapshot (or raw recovery data when loading
is blocked) under `budgetyar-backup-recovery-v1:<account-id>`. The anonymous
suffix is `anonymous`. Import then commits the complete finance snapshot as a
batch. Failure restores the prior in-memory state; the durable journal protects
the stored state. Imported data starts in local mode and needs an explicit
cloud transfer. Cloud download and account switching use the same validated
batch commit. Neither a malformed cloud response nor an invalid account cache
is silently replaced with empty data.

Changes made by another browser tab block writes in the stale tab; the retry
button reloads the stored data. This is a recovery guard, not a collaborative
editing or automatic merge feature. The journal is a browser storage recovery
mechanism, not a database transaction or a guarantee against disk/OS failure.
Keep an independent backup before device changes and upgrades.

The Settings deletion action removes the current account's device finance data,
its local account cache and its previous-import recovery file, and disables cloud
transfer. It leaves other accounts' device caches and the server unchanged.
Account deletion is a separate account action. Signing out does not erase device
caches, and clearing browser data erases all local recovery copies.

Backups and local caches are plaintext, not encrypted by amount masking or app
lock. The release policy is explicit plaintext export with a visible notice;
password-protected backup files are not offered. Store exports in a protected
location and use separate OS accounts on shared devices. App backups and raw
recovery exports must not be attached to public bug reports.

Validation:

```powershell
npm test
npm run build:app
npx playwright install chromium
npm run test:storage:browser
# Or use an installed Edge browser on Windows:
npm run test:storage:browser -- --browser=msedge
```

The browser suite serves only the generated static build, uses synthetic finance
records, blocks service workers, and returns unauthenticated responses for API
requests. It does not exercise a production account, a real cloud database,
Android storage/upgrade, or payment. Those belong to their respective release gates.

Acceptance recorded on 2026-11-17: 159 Vitest tests, package and app builds, and
five browser scenarios passed with installed Microsoft Edge at 390 × 844:
backup round trip, corrupt-data rescue, quota rollback/retry, device deletion,
and stale-tab protection. GitHub CI execution is verified separately after push.
