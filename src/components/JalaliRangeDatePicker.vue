<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useOutsideClick } from '../composables/useOutsideClick'
import { todayDateOnly } from '../utils/dateOnly'
import type { DigitMode } from '../utils/digits'
import { formatJalaliDate } from '../utils/format'
import { compareDates } from '../utils/jalali'
import JalaliCalendar from './JalaliCalendar.vue'

export interface JalaliDateRange { start: string | null; end: string | null }

const props = withDefaults(defineProps<{
  modelValue: JalaliDateRange
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  showTodayButton?: boolean
  minDate?: string
  maxDate?: string
  disabledDates?: string[]
  digitMode?: DigitMode
  inputClass?: string
  popoverClass?: string
  calendarClass?: string
}>(), {
  placeholder: 'انتخاب بازه تاریخ',
  disabled: false,
  clearable: true,
  showTodayButton: true,
  disabledDates: () => [],
  digitMode: 'persian',
  inputClass: '', popoverClass: '', calendarClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: JalaliDateRange]
  select: [value: JalaliDateRange]
}>()
const root = ref<HTMLElement | null>(null)
const open = ref(false)
const draftStart = ref<string | null>(null)
const draftEnd = ref<string | null>(null)
const hoverDate = ref<string | null>(null)
const displayDate = ref<string | null>(props.modelValue.start ?? props.modelValue.end)

const display = computed(() => {
  const { start, end } = props.modelValue
  if (!start) return ''
  const first = formatJalaliDate(start, { digitMode: props.digitMode })
  return end ? `${first} – ${formatJalaliDate(end, { digitMode: props.digitMode })}` : first
})
watch(() => props.modelValue, value => {
  displayDate.value = value.start ?? value.end
  if (!open.value) resetDraft()
}, { deep: true })
useOutsideClick(root, close)

const selectable = (iso: string) => !props.disabledDates.includes(iso)
  && (!props.minDate || compareDates(iso, props.minDate) >= 0)
  && (!props.maxDate || compareDates(iso, props.maxDate) <= 0)

function update(value: JalaliDateRange) {
  emit('update:modelValue', value)
  emit('select', value)
}
function select(iso: string) {
  displayDate.value = iso
  hoverDate.value = null
  if (!draftStart.value || draftEnd.value) {
    draftStart.value = iso
    draftEnd.value = null
    return
  }
  const start = compareDates(draftStart.value, iso) <= 0 ? draftStart.value : iso
  const end = start === draftStart.value ? iso : draftStart.value
  draftStart.value = start
  draftEnd.value = end
}
function clear() {
  draftStart.value = null
  draftEnd.value = null
  hoverDate.value = null
  update({ start: null, end: null })
}
function chooseToday() {
  const today = todayDateOnly()
  if (!selectable(today)) return
  draftStart.value = today
  draftEnd.value = today
  displayDate.value = today
}
function show() {
  if (props.disabled) return
  resetDraft()
  open.value = true
}
function resetDraft() {
  draftStart.value = props.modelValue.start
  draftEnd.value = props.modelValue.end
  hoverDate.value = null
  displayDate.value = props.modelValue.start ?? props.modelValue.end
}
function close() {
  open.value = false
  resetDraft()
}
function confirm() {
  if (!draftStart.value || !draftEnd.value) return
  update({ start: draftStart.value, end: draftEnd.value })
  open.value = false
}
</script>

<template>
  <div ref="root" class="relative inline-block w-full max-w-sm [font-family:Noto_Sans_Arabic_Variable,Tahoma,sans-serif]" dir="rtl" @keydown.esc="close">
    <div class="relative">
      <input
        type="text"
        readonly
        :value="display"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-expanded="open"
        aria-haspopup="dialog"
        aria-label="بازه تاریخ جلالی"
        :class="['w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 pl-16 text-right text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100', inputClass]"
        @click="show"
        @focus="show"
      >
      <button v-if="clearable && (modelValue.start || modelValue.end) && !disabled" type="button" class="absolute left-9 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500" aria-label="پاک کردن بازه" @click.stop="clear">×</button>
      <button type="button" :disabled="disabled" class="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:text-slate-300" aria-label="باز کردن تقویم" @click="open ? close() : show()">▣</button>
    </div>
    <div v-if="open" role="dialog" aria-label="انتخاب بازه تاریخ" :class="['absolute right-0 z-50 mt-2', popoverClass]">
      <JalaliCalendar
        :display-date="displayDate"
        :range-start="draftStart"
        :range-end="draftEnd"
        :hover-date="draftStart && !draftEnd ? hoverDate : null"
        :min-date="minDate"
        :max-date="maxDate"
        :disabled-dates="disabledDates"
        :digit-mode="digitMode"
        :calendar-class="calendarClass"
        @select="select"
        @hover="hoverDate = $event"
      >
        <template #footer>
          <div class="flex items-center justify-between gap-2">
            <button v-if="showTodayButton" type="button" class="rounded-md px-2 py-1.5 text-xs font-medium text-teal-700 outline-none hover:bg-teal-50 focus:ring-2 focus:ring-teal-500" @click="chooseToday">امروز</button>
            <span v-else />
            <div class="flex gap-2">
              <button type="button" class="rounded-md px-2 py-1.5 text-xs text-slate-500 outline-none hover:bg-slate-100 focus:ring-2 focus:ring-slate-400" @click="close">انصراف</button>
              <button type="button" :disabled="!draftStart || !draftEnd" class="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white outline-none hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-300" @click="confirm">تأیید</button>
            </div>
          </div>
        </template>
      </JalaliCalendar>
    </div>
  </div>
</template>
