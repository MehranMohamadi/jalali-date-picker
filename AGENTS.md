# Codex Project Notes

Compact project guide for future Codex turns. Keep it accurate and update it when architecture or commands change.

## Overview

- This repo contains a Nuxt 3 / Vue 3 Jalali date-picker package and a larger Budgetyar finance playground.
- The root package is published as `nuxt-jalali-minical`; `src/` builds into `dist/` via `unbuild`.
- `playground/` is the Persian RTL Budgetyar demo app: a personal finance dashboard.
- `api/` contains Vercel account, cloud-sync, and financial-advice endpoints; `playground/server/api/` contains matching Nuxt development endpoints.
- `backend/` is a separate Go service with platform storage/HTTP code, finance models, health, sync, and MCP endpoints.
- Budgetyar keeps device finance state in `localStorage`; account-owned cloud snapshots are stored in Neon PostgreSQL through the Go backend.
- Finance UI and app logic usually live in `playground/composables/useBudgetyar.ts`, `playground/pages/*.vue`, and `playground/assets/css/`.
- Reusable date-picker/date logic lives in `src/` and is covered by `tests/`.

## Important Files

- `playground/app.vue`: app shell, navigation, route-to-section mapping, FAB, modal, and toasts.
- `playground/composables/useBudgetyar.ts`: main state/actions/computed values, Chart.js setup, localStorage, reports, installments, bank notifications, and finance/date helpers.
- `playground/pages/index.vue`: dashboard, compact metric cards, latest expenses, installment summary, and dashboard charts.
- `playground/pages/transactions.vue`: filters, transaction list, and lightweight pagination.
- `playground/pages/budgets.vue`: categories, monthly budgets, spending, and budget progress.
- `playground/pages/installments.vue`: installment form/list and payment/edit actions.
- `playground/pages/analytics.vue`: reports, stats, charts, weekly budget analysis, and cash flow modes.
- `playground/pages/notifications.vue`: Android/Capacitor bank notification suggestions.
- `playground/pages/settings.vue`: account-based cloud transfer, export, backup/import, PWA install, and theme settings.
- `playground/pages/login.vue` and `playground/composables/useAuth.ts`: account UI and client session state. Never store passwords or session tokens in browser storage.
- `playground/components/*.vue`: small UI components; transaction form is `TransactionModal.vue`.
- `playground/assets/css/budgetyar.css`: main Budgetyar styles.
- `playground/assets/css/budgetyar-overrides.css`: newer fixes/overrides.
- `src/utils/jalali.ts`: Jalali/Gregorian conversion and date math; prefer these helpers over ad hoc date code.
- `src/utils/dateOnly.ts`, `digits.ts`, and `format.ts`: date-only, digit conversion, and formatting helpers.
- `src/utils/bankNotification.ts`: bank notification parser; keep parser behavior covered by tests.
- `src/utils/creditLedger.ts`, `installmentLedger.ts`, `budgetyarPlanning.ts`, `budgetyarGoals.ts`, `budgetyarAdvancedFinance.ts`, and `financialAdvice.ts`: finance domain logic used by the playground where imported.
- `src/components/`: package calendar and picker components; `src/composables/useJalaliCalendar.ts` owns calendar interaction state.
- `src/module.ts`, `src/plugin.ts`, and `src/index.ts`: Nuxt module integration, plugin, and public exports. Keep package exports in sync with `package.json`.
- `api/financial-advice.ts` and `playground/server/api/financial-advice.post.ts`: financial advice handlers; check both when changing shared behavior.
- `src/server/cloudAccess.ts` and `accountApi.ts`: server-only backend proxy and HttpOnly account cookie. Keep `api/account.ts`, `api/cloud-sync.ts`, and their `playground/server/api/` counterparts aligned.
- `backend/README.md`, `backend/go.mod`, and `backend/migrations/`: Go service documentation, dependencies, and schema migrations.
- `tests/*.test.ts`: Vitest coverage for dates, bank notifications, and finance utilities.

## Commands

- Run tests: `npm test`
- Start playground dev server: `npm run dev`
- Build package: `npm run build`
- Generate static playground: `npm run build:app`
- Generate the Android remote bootstrap: `npm run build:mobile`, then `npx cap sync android`. APK builds remain manual.
- Build the frontend for Vercel: `npm run build:vercel`
- Backend tests: from `backend/`, run `go test ./...` (if Go is installed).
- If Nuxt generate is blocked by a dev-server lock, use PowerShell:
  `$env:NUXT_IGNORE_LOCK='1'; npm run build:app`
- Root `npm test` runs `vitest run`; `npm run build` builds the publishable package, while `npm run build:app` generates the playground. They validate different outputs.

## Budgetyar Architecture

- Pages consume shared state/actions from `useBudgetyar()`.
- `startBudgetyar()` is called only from `playground/app.vue`.
- When adding shared state or actions, expose them from the returned object at the end of `useBudgetyar()` if pages/components need them.
- Charts are created in the composable with Chart.js. Pages with canvases call `scheduleChartSync` on mount and `destroyCharts` on unmount.
- `isMobileViewport` is used for mobile performance; some dashboard charts become text summaries on mobile.
- Preserve Persian and RTL behavior. UI copy should stay short, direct, and Persian.
- Package components should preserve RTL defaults, keyboard navigation, accessible native controls, and the date-only ISO model contract described in `README.md`.
- The repository-level response rule requires `\\u2067` at the start of every Persian paragraph. Use `\\u200F` before Persian text embedded in code or LTR content when needed.
- In Codex replies, explanations, comments, Markdown, and Persian strings inside code/files, if Persian text may render inside a left-to-right context, prefix the Persian text with the Unicode RTL mark `\u200F`.

## Date And Budget Rules

- Budgetyar stores/displays app dates as Jalali `YYYY/MM/DD`.
- Use `src/utils/jalali.ts` and existing composable helpers for date math; avoid string-based date hacks.
- The current week is Saturday through Friday.
- Week ranges are computed through Jalali/Gregorian conversion and `addJalaliDays`.
- Monthly budget is the sum of `budgets`.
- Current month week count is currently `Math.ceil(currentMonthLength / 7)`.
- Total weekly budget allowance is `totalBudget / currentMonthWeekCount`.
- Per-category weekly budget is `category.budget / currentMonthWeekCount`.
- The suspicious weekly spending report shows categories whose current-week spending is at least 80% of that category weekly budget, sorted by highest ratio.

## UI Preferences

- Keep the dashboard compact, low-height, and easy to scan.
- First dashboard metric cards should remain small and one-line.
- The top widget row should remain compact and one-line.
- The bottom dashboard weekly category budget section should remain low-height and multi-column.
- Avoid adding large dashboard panels unless necessary.
- Preserve the current dark glass style unless the user asks for a visual/theme change.
- Before adding CSS, search existing classes; prefer small overrides over broad rewrites.
- On mobile, avoid overlap, clipped text, and heavy charts.

## Data And Storage

- localStorage keys are defined in `useBudgetyar.ts`:
  `budgetyar-transactions-v1`, `budgetyar-categories-v1`, `budgetyar-budgets-v1`, `budgetyar-credit-limit-v1`, `budgetyar-installments-v1`, `budgetyar-theme-v1`.
- Schema changes must remain compatible with import/export and old saved data.
- Amounts are in toman. Use `parseMoneyInput`, `formatMoneyInput`, `formatMoney`, and `formatCompact` for money input/display.
- Validate imported/local data at boundaries and preserve compatibility with older saved records; avoid changing storage keys or shapes without a migration/fallback.
- Treat API keys as server-only secrets. Never use public Nuxt variables for secrets or expose keys in client code/logs. See `README.md` for GapGPT setup and endpoint caveats.
- Cloud sync requires a valid account session; the backend derives `user_id` from that session. Never accept a user ID supplied by the browser for snapshot access. Run migrations in numeric order, and preserve existing snapshots during account/schema changes.
- `useBudgetyar.ts` keeps device snapshots under `budgetyar-account-local-v1:<account-id>` when accounts switch. Preserve the explicit upload/download step and reset cloud version/auto-sync state on account changes; never auto-upload the previous account's device data.
- Passwords use Argon2id in the Go backend. Account sessions are opaque random tokens hashed in PostgreSQL and carried in HttpOnly cookies; same-origin checks protect write requests. The old shared cloud password and browser-only account list are obsolete.

## Android / PWA

- Android/Capacitor project files are under `android/`.
- Native bank notification files are under `android/app/src/main/java/ir/budgetyar/app/`.
- Shared JS parser is `src/utils/bankNotification.ts`; update/add tests when changing parser behavior.
- Service worker is unregistered in dev and registered in production.
- PWA assets and offline behavior live in `playground/public/`; check the manifest and service worker when changing install/offline behavior.
- Android shell v2 opens the trusted hosted origin; `mobile/` is the local bootstrap/error page. `BudgetyarUpdatesPlugin` migrates allowlisted device finance data before remote app initialization. `MainActivity` injects the native bridge at document start, including cached HTML; keep its plugin list synchronized with registrations.
- `scripts/build-app.mjs` and `update-release.mjs` finalize a single release after generation. `useAppUpdates.ts` owns the waiting/apply UI. See `docs/in-app-updates.md` for migration, integrity, recovery, and test contracts; raw Nuxt generation is not a deployable update release.

## Package Contracts

- Public picker values are Gregorian date-only ISO strings (`YYYY-MM-DD`); Jalali values are for display and calendar arithmetic. Avoid timezone conversions that shift calendar days.
- Keep the package dependency-light and TypeScript-first. Do not add a date library for functionality covered by existing utilities.
- Components/module auto-import behavior and optional prefix/font settings are documented in `README.md`; keep docs aligned with implementation.
- `dist/` is generated output. Edit `src/` and rebuild instead of hand-editing generated files.

## API And Backend

- Financial-advice requests should send only the data needed for analysis. Current README says the playground sends aggregate totals/trends and category summaries, not individual transactions; preserve that privacy boundary unless explicitly changed.
- The Vercel API and Nuxt server API may have different runtime/configuration constraints. Keep secrets server-side and verify the matching deployment path when changing either handler.
- Account and cloud sync use `api/account.ts` and `api/cloud-sync.ts` on Vercel, with matching `playground/server/api/` routes for Nuxt development. Shared cookie, account, and proxy logic is in `src/server/cloudAccess.ts` and `src/server/accountApi.ts`. The browser never receives the backend bearer token or URL; the frontend server reads them from environment variables documented in `README.md`.
- The bundled Capacitor app uses `BudgetyarApiPlugin.java` to call the hosted frontend account/cloud API with Android's HttpOnly cookie jar. Its HTTPS origin is set in `capacitor.config.ts` and can be overridden with `BUDGETYAR_MOBILE_API_URL` before `cap sync android`. Keep the backend bearer token on the frontend server.
- Backend configuration examples belong in `backend/.env.example`; never commit real credentials. Read `backend/README.md` before changing backend routes, storage, or migrations.
- Keep schema migrations additive and compatible with existing deployments; do not rewrite applied migrations.

## Workflow

- Before editing, read only the relevant files. For Budgetyar work, `useBudgetyar.ts` + the target page + related CSS is usually enough.
- Avoid broad refactors or architecture moves unless explicitly requested.
- If Persian text appears mojibake in the terminal, still keep files encoded as UTF-8.
- Do not revert unrelated user changes.
- Follow `RTK.md`: prefix shell commands with `rtk` when supported. If a shell builtin is unsupported, use a suitable wrapped executable or the narrowest fallback.
- Avoid printing `.env` contents, credentials, or personal finance data in command output.
- After Android changes, do not build an APK automatically. Give the user the documented PowerShell commands to build it themselves.
- For package changes, inspect public entry points and README contracts. For finance changes, inspect the relevant domain utility, composable consumer, and page instead of scanning the whole app.

## Verification

- After changing `src/utils/*`, package components, or date/notification logic: run `npm test`; use `npm run build` when package exports, module integration, or component compilation changed.
- After changing `playground/*` or `api/*`: run `npm test`, then `npm run build:app` when the change affects generated frontend routes/components. For API-only changes, validate the relevant deployment build/runtime path.
- After changing `backend/*.go`: run `go test ./...` from `backend/` when Go is available.
- Do not run broad builds for documentation-only changes.
- A Nitro warning about `@nuxt/nitro-server/dist/runtime/utils/cache-driver` has been non-blocking in prior builds.
