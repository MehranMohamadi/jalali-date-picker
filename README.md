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

The Vazirmatn variable font is loaded automatically. Set `loadFont: false` in the module options to use your application's own Persian font.

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
