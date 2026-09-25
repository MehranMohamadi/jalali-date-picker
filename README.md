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

The Settings page now asks only for a cloud login password. The frontend server proxies sync requests to the separate Go backend, keeping the backend URL and bearer token out of browser storage and bundles. Set these variables on the **frontend** Vercel project (or in `playground/.env` for local Nuxt development):

```text
BUDGETYAR_API_TOKEN=the-same-32-character-or-longer-token-configured-on-the-backend
BUDGETYAR_CLOUD_PASSWORD=a-private-password-with-at-least-16-characters
BUDGETYAR_SESSION_SECRET=a-separate-random-secret-with-at-least-32-characters
```

The backend URL defaults to `https://jalali-date-picker.vercel.app`; set `BUDGETYAR_BACKEND_URL` on the frontend only if it changes. The Go backend still needs its own `DATABASE_URL` and matching `BUDGETYAR_API_TOKEN`. After deployment, enter the cloud login password once in Settings. The login uses a signed, HttpOnly, SameSite=Strict cookie valid for 30 days. No cloud endpoint is usable when the required secrets are missing. Local static-file previews cannot serve the cloud API; use `npm run dev` or the deployed Vercel app.
