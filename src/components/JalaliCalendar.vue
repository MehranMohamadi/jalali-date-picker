<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useJalaliCalendar } from '../composables/useJalaliCalendar'
import { displayDigits, type DigitMode } from '../utils/digits'
import { JALALI_MONTH_NAMES, PERSIAN_WEEKDAYS_SHORT } from '../utils/format'
import { addJalaliDays, compareDates, isDateInRange, toGregorian, toJalali, type JalaliDate } from '../utils/jalali'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  displayDate?: string | null
  rangeStart?: string | null
  rangeEnd?: string | null
  hoverDate?: string | null
  minDate?: string
  maxDate?: string
  disabledDates?: string[]
  digitMode?: DigitMode
  calendarClass?: string
  dayClass?: string
  selectedDayClass?: string
  rangeClass?: string
}>(), {
  modelValue: null,
  displayDate: null,
  rangeStart: null,
  rangeEnd: null,
  hoverDate: null,
  disabledDates: () => [],
  digitMode: 'persian',
  calendarClass: '',
  dayClass: '',
  selectedDayClass: '',
  rangeClass: '',
})

const emit = defineEmits<{
  select: [date: string]
  hover: [date: string | null]
  'month-change': [month: JalaliDate]
}>()

const { visibleMonth, days, moveMonth, setMonthFromIso } = useJalaliCalendar(() => props.displayDate ?? props.modelValue)
const focusedDate = ref<string | null>(props.modelValue ?? props.rangeStart ?? null)
const dayButtons = ref<Record<string, HTMLButtonElement | null>>({})
const disabledSet = computed(() => new Set(props.disabledDates))

watch(() => props.displayDate ?? props.modelValue, value => {
  if (value) setMonthFromIso(value)
})
watch(visibleMonth, month => emit('month-change', month), { deep: true })

const previewEnd = computed(() => props.rangeEnd ?? props.hoverDate)
const isDisabled = (iso: string) => disabledSet.value.has(iso)
  || (!!props.minDate && compareDates(iso, props.minDate) < 0)
  || (!!props.maxDate && compareDates(iso, props.maxDate) > 0)
const isSelected = (iso: string) => iso === props.modelValue || iso === props.rangeStart || iso === props.rangeEnd
const isInPreviewRange = (iso: string) => isDateInRange(iso, props.rangeStart, previewEnd.value)

function select(iso: string) {
  if (isDisabled(iso)) return
  focusedDate.value = iso
  emit('select', iso)
}

async function focusIso(iso: string) {
  const j = toJalali(iso)
  if (j.year !== visibleMonth.value.year || j.month !== visibleMonth.value.month) setMonthFromIso(iso)
  await nextTick()
  focusedDate.value = iso
  dayButtons.value[iso]?.focus()
}

function onDayKeydown(event: KeyboardEvent, iso: string) {
  const offsets: Record<string, number> = { ArrowRight: -1, ArrowLeft: 1, ArrowUp: -7, ArrowDown: 7 }
  if (event.key in offsets) {
    event.preventDefault()
    const j = toJalali(iso)
    const value = addJalaliDays(j, offsets[event.key])
    const next = toGregorian(value.year, value.month, value.day)
    if (!isDisabled(next)) void focusIso(next)
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    const j = toJalali(iso)
    const gregorian = new Date(`${iso}T00:00:00Z`).getUTCDay()
    const persianWeekday = (gregorian + 1) % 7
    const offset = event.key === 'Home' ? -persianWeekday : 6 - persianWeekday
    const next = addJalaliDays(j, offset)
    void focusIso(toGregorian(next.year, next.month, next.day))
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    select(iso)
  }
}
</script>

<template>
  <div dir="rtl" role="application" aria-label="تقویم جلالی" :class="['w-72 rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-lg [font-family:Noto_Sans_Arabic_Variable,Tahoma,sans-serif]', calendarClass]">
    <div class="mb-3 flex items-center justify-between">
      <button type="button" class="rounded-lg p-2 text-teal-700 outline-none hover:bg-teal-50 focus:ring-2 focus:ring-teal-500" aria-label="ماه قبل" @click="moveMonth(-1)">‹</button>
      <div class="font-semibold text-slate-800" aria-live="polite">
        {{ JALALI_MONTH_NAMES[visibleMonth.month - 1] }} {{ displayDigits(visibleMonth.year, digitMode) }}
      </div>
      <button type="button" class="rounded-lg p-2 text-teal-700 outline-none hover:bg-teal-50 focus:ring-2 focus:ring-teal-500" aria-label="ماه بعد" @click="moveMonth(1)">›</button>
    </div>
    <div class="grid grid-cols-7 text-center text-xs text-slate-500">
      <div v-for="weekday in PERSIAN_WEEKDAYS_SHORT" :key="weekday" class="py-1" aria-hidden="true">{{ weekday }}</div>
    </div>
    <div class="grid grid-cols-7 gap-y-1" role="grid" @mouseleave="emit('hover', null)">
      <div v-for="(item, index) in days" :key="item?.iso ?? `empty-${index}`" role="gridcell" class="flex h-9 items-center justify-center">
        <button
          v-if="item"
          :ref="element => { dayButtons[item!.iso] = element as HTMLButtonElement | null }"
          type="button"
          :disabled="isDisabled(item.iso)"
          :tabindex="focusedDate === item.iso || (!focusedDate && item.jalali.day === 1) ? 0 : -1"
          :aria-label="`${item.jalali.year}/${item.jalali.month}/${item.jalali.day}`"
          :aria-selected="isSelected(item.iso)"
          :class="[
            'relative h-8 w-9 rounded-lg text-sm outline-none transition focus:z-10 focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:text-slate-300',
            !isSelected(item.iso) && !isInPreviewRange(item.iso) && 'hover:bg-teal-50',
            item.isToday && !isSelected(item.iso) && 'font-bold text-teal-700 ring-1 ring-inset ring-teal-300',
            isInPreviewRange(item.iso) && !isSelected(item.iso) && ['rounded-none bg-teal-200 font-medium text-teal-950 hover:bg-teal-300', rangeClass],
            isSelected(item.iso) && ['bg-teal-700 font-semibold text-white hover:bg-teal-800', selectedDayClass],
            dayClass,
          ]"
          @click="select(item.iso)"
          @mouseenter="emit('hover', item.iso)"
          @focus="focusedDate = item.iso"
          @keydown="onDayKeydown($event, item.iso)"
        >{{ displayDigits(item.jalali.day, digitMode) }}</button>
      </div>
    </div>
    <div v-if="$slots.footer" class="mt-2 border-t border-slate-100 pt-2">
      <slot name="footer" />
    </div>
  </div>
</template>
