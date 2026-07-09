# Codex Project Notes

Compact project guide for future Codex turns. Keep this file concise so agents can spend fewer tokens on orientation.

## Overview

- This repo is a Nuxt 3 Jalali date-picker package.
- `playground/` is the Persian RTL Budgetyar demo app: a personal finance dashboard.
- Budgetyar persists transactions, categories, budgets, installments, credit limit, theme, and report/export data in `localStorage`.
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
- `playground/pages/settings.vue`: export, backup/import, PWA install, and theme settings.
- `playground/components/*.vue`: small UI components; transaction form is `TransactionModal.vue`.
- `playground/assets/css/budgetyar.css`: main Budgetyar styles.
- `playground/assets/css/budgetyar-overrides.css`: newer fixes/overrides.
- `src/utils/jalali.ts`: Jalali/Gregorian conversion and date math; prefer these helpers over ad hoc date code.
- `src/utils/bankNotification.ts`: bank notification parser; covered by `tests/bankNotification.test.ts`.
- `tests/*.test.ts`: Vitest coverage for Jalali dates, ranges, and bank notifications.

## Commands

- Run tests: `npm test`
- Start playground dev server: `npm run dev`
- Build package: `npm run build`
- Generate static playground: `npm run build:app`
- If Nuxt generate is blocked by a dev-server lock, use PowerShell:
  `$env:NUXT_IGNORE_LOCK='1'; npm run build:app`

## Budgetyar Architecture

- Pages consume shared state/actions from `useBudgetyar()`.
- `startBudgetyar()` is called only from `playground/app.vue`.
- When adding shared state or actions, expose them from the returned object at the end of `useBudgetyar()` if pages/components need them.
- Charts are created in the composable with Chart.js. Pages with canvases call `scheduleChartSync` on mount and `destroyCharts` on unmount.
- `isMobileViewport` is used for mobile performance; some dashboard charts become text summaries on mobile.
- Preserve Persian and RTL behavior. UI copy should stay short, direct, and Persian.
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

## Android / PWA

- Android/Capacitor project files are under `android/`.
- Native bank notification files are under `android/app/src/main/java/ir/budgetyar/app/`.
- Shared JS parser is `src/utils/bankNotification.ts`; update/add tests when changing parser behavior.
- Service worker is unregistered in dev and registered in production.

## Workflow

- Before editing, read only the relevant files. For Budgetyar work, `useBudgetyar.ts` + the target page + related CSS is usually enough.
- Avoid broad refactors or architecture moves unless explicitly requested.
- If Persian text appears mojibake in the terminal, still keep files encoded as UTF-8.
- Do not revert unrelated user changes.

## Verification

- After changing `src/utils/*` or date/notification logic: run `npm test`.
- After changing `playground/*`: run `npm test`, then `npm run build:app`.
- A Nitro warning about `@nuxt/nitro-server/dist/runtime/utils/cache-driver` has been non-blocking in prior builds.
