# nuxt-jalali-minical

A small, TypeScript-first Jalali calendar library for Nuxt 3 and Vue 3. It provides an accessible calendar, single date picker, range date picker, Persian digits, RTL defaults, and date-only Gregorian ISO model values. No Moment.js or runtime date dependency.

## Installation

```bash
npm install nuxt-jalali-minical
```

Add the module to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-jalali-minical/module'],
})
```

Components and utility functions are then auto-imported. An optional prefix is available:

```ts
export default defineNuxtConfig({
  modules: [['nuxt-jalali-minical/module', { prefix: 'Mini' }]],
})
```

The Noto Sans Arabic variable font is loaded automatically. Set `loadFont: false` in the module options to use your application's own Persian font.

## Tailwind setup

The package ships Tailwind utility classes and no global stylesheet. Include the built package in Tailwind's content scan (especially with Tailwind 3):

```ts
// tailwind.config.ts
export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './pages/**/*.vue',
    './node_modules/nuxt-jalali-minical/dist/**/*.{js,mjs,vue}',
  ],
}
```

Tailwind 4 users can add this to their main CSS instead:

```css
@source "../node_modules/nuxt-jalali-minical/dist";
```

## Usage

```vue
<script setup lang="ts">
const date = ref<string | null>(null)
const range = ref<{ start: string | null; end: string | null }>({
  start: null,
  end: null,
})
</script>

<template>
  <div dir="rtl" class="space-y-4">
    <JalaliDatePicker v-model="date" placeholder="انتخاب تاریخ" />
    <JalaliRangeDatePicker v-model="range" placeholder="انتخاب بازه تاریخ" />
  </div>
</template>
```

The external value is always a Gregorian date-only ISO string (`YYYY-MM-DD`). Jalali conversion is only used for UI and calendar arithmetic, avoiding timezone shifts.

## Props

### `JalaliDatePicker`

| Prop | Type | Default |
| --- | --- | --- |
| `modelValue` | `string \| null` | required |
| `placeholder` | `string` | `انتخاب تاریخ` |
| `disabled` | `boolean` | `false` |
| `clearable` | `boolean` | `true` |
| `showTodayButton` | `boolean` | `true` |
| `minDate`, `maxDate` | `string` | — |
| `disabledDates` | `string[]` | `[]` |
| `digitMode` | `'persian' \| 'latin'` | `'persian'` |
| `inputClass`, `popoverClass`, `calendarClass` | `string` | `''` |

### `JalaliRangeDatePicker`

Accepts the same props, with `modelValue` typed as `{ start: string | null; end: string | null }`. If the second selected date is earlier than the first, the values are automatically swapped. Hovering after the first selection previews the pending range.

### `JalaliCalendar`

The lower-level calendar accepts `modelValue`, `displayDate`, `rangeStart`, `rangeEnd`, `hoverDate`, `minDate`, `maxDate`, `disabledDates`, `digitMode`, and class overrides: `calendarClass`, `dayClass`, `selectedDayClass`, and `rangeClass`.

## Events

- Pickers emit `update:modelValue` and `select`.
- `JalaliCalendar` emits `select`, `hover`, and `month-change`.

## Utilities

```ts
import {
  toJalali,
  toGregorian,
  formatJalaliDate,
  parseJalaliInput,
  isValidJalaliDate,
  isJalaliLeapYear,
  getJalaliMonthLength,
  compareDates,
  isDateInRange,
  addJalaliMonths,
  addJalaliDays,
} from 'nuxt-jalali-minical'
```

`toGregorian` returns a date-only ISO string. `toJalali`, `addJalaliMonths`, and `addJalaliDays` return `{ year, month, day }` objects.

## Accessibility

Day cells are native buttons with disabled and selected states. The grid supports arrow-key movement, Home/End, Enter/Space, visible focus rings, Escape to close, and outside-click dismissal.

## Known limitations

- The supported Jalali year range is `-61` through `3177`, matching the break-year arithmetic used by the conversion algorithm.
- One month is displayed at a time; multi-month layouts and time selection are intentionally outside this first release.
- Consumers must include the package path in their Tailwind source scan.

## Development

```bash
npm install
npm test
npm run build
npm run dev
```

## Budgetyar AI analysis

The Budgetyar playground can generate financial advice on demand from its Health page using [GapGPT's OpenAI-compatible API](https://gapgpt.app/platform-v2/docs/quickstart). Set these server-side environment variables in the frontend Vercel project; for local `npm run dev`, set them in `playground/.env`:

```text
GAPGPT_API_KEY=your-gapgpt-api-key
GAPGPT_MODEL=gpt-4o
```

The GapGPT key remains server-side; never put it in a public Nuxt variable or browser form. Analysis sends aggregate totals and monthly trends across the recorded history, current commitments, and category summaries, but not individual transactions; it runs only when the button is clicked. A static-file preview alone cannot serve the API route; use the Nuxt dev server locally or deploy the frontend to Vercel. The endpoint currently has no user authentication, so anyone who can reach the site can trigger paid API requests; add authentication before sharing it publicly.

## Budgetyar cloud sync

Create a username and password on the Account page, then choose cloud storage in Settings. Accounts and sessions are stored in PostgreSQL, and each cloud snapshot is keyed by the authenticated account ID. Passwords are hashed with Argon2id; the browser only receives an HttpOnly session cookie. The frontend server proxies requests to the Go backend, keeping the shared backend token out of browser storage and bundles. Copy `playground/.env.example` to `playground/.env` for local Nuxt development, and set its cloud variables on the **frontend** Vercel project. Set the variables from `backend/.env.example` on the separate **backend** project. The token must match in both projects. Apply both SQL files in `backend/migrations/` in order. `BUDGETYAR_ANALYSIS_TOKEN` is not used by the current code.

The backend URL defaults to `https://jalali-date-picker.vercel.app`; set `BUDGETYAR_BACKEND_URL` on the frontend only if it changes. The Go backend needs `DATABASE_URL` and the matching `BUDGETYAR_API_TOKEN`. A remembered login lasts up to 30 days; an unremembered login ends when the browser session closes or after 24 hours. Existing browser-only accounts are not trusted or migrated because their passwords were stored in plain text; finance data on the device remains intact. The first signed-in account claims existing device data locally; later account switches keep separate device copies and never auto-upload another account's data. Register a new account and explicitly upload or download its cloud data. Password changes require an authenticated session and the current password; there is no insecure username-only reset. Local static-file previews cannot serve the cloud API; use `npm run dev` or the deployed Vercel app.
