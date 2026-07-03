# Codex Project Notes

## Overview

This repo is a Nuxt 3 Jalali date-picker/package project with a large demo app in `playground/app.vue`.
Most user-facing finance UI work in this workspace has been happening in that single file.

The playground app is a Persian RTL personal budget dashboard named Budgetyar. It stores transactions,
categories, and budgets in `localStorage`.

## Important Files

- `playground/app.vue`: main playground app, finance dashboard, reports, stats, charts, forms, and styles.
- `src/utils/jalali.ts`: Jalali/Gregorian date utilities. Prefer these helpers over ad hoc date math.
- `tests/*.test.ts`: Vitest coverage for Jalali/date range utilities.
- `package.json`: scripts for test, dev, build, and static generation.

## Commands

- Run tests: `npm test`
- Run playground dev server: `npm run dev`
- Generate static playground: `npm run build:app`
- If a Nuxt dev server lock blocks generation while the dev server is already running, use:
  `NUXT_IGNORE_LOCK=1 npm run build:app`
  On PowerShell: `$env:NUXT_IGNORE_LOCK='1'; npm run build:app`

## Current Playground Behavior

Dashboard:

- The first metric cards are intentionally very compact and one-line.
- The first dashboard metric is `خرج هفتگی`, based on current-week expenses.
- The top widget row is also one-line and compact.
- `بودجه هفتگی` shows total monthly budget divided by the number of weeks in the current Jalali month.
- `سه خرج آخر` shows the latest three expense transactions.
- At the bottom of the dashboard, `بودجه هفتگی بخش‌ها` shows each category budget divided by the number of weeks in the month. Keep this section low-height.

Stats:

- The stats section includes weekly income/expense summary cards.
- There is a weekly flow chart for current-week income and expenses.

Reports:

- At the top of `گزارش‌ها`, `خرج‌های مشکوک این هفته` compares current-week spending per category against that category's weekly budget.
- It flags categories at or above 80% of weekly budget, sorted by highest ratio.
- If spending exceeds the weekly budget, it shows the over-budget amount.

## Date And Budget Logic

- Current week is treated as Saturday through Friday.
- Week ranges are computed using Jalali dates converted through `toGregorian` and `addJalaliDays`.
- Monthly budget is the sum of `budgets`.
- Number of weeks in the month is currently `Math.ceil(currentMonthLength / 7)`.
- Weekly budget allowance is `totalBudget / currentMonthWeekCount`.
- Per-category weekly budget is `category.budget / currentMonthWeekCount`.

## UI Style Preferences From Recent Work

- Keep dashboard cards minimal, one-line, and low-height.
- Avoid adding large panels/cards to dashboard unless necessary.
- Prefer compact multi-column grids for budget breakdowns.
- Persian UI copy should be short and direct.
- Preserve RTL layout.
- Keep chart sections and the existing dark glass visual style unless asked otherwise.

## Verification Notes

After changes to `playground/app.vue`, run:

1. `npm test`
2. `npm run build:app` or the PowerShell `NUXT_IGNORE_LOCK` variant if a dev server is already running.

The build may emit a Nitro warning about `@nuxt/nitro-server/dist/runtime/utils/cache-driver`; this has been non-blocking in current runs.
