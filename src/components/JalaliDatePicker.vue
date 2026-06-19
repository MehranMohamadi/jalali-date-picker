<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useOutsideClick } from '../composables/useOutsideClick'
import { todayDateOnly } from '../utils/dateOnly'
import type { DigitMode } from '../utils/digits'
import { formatJalaliDate } from '../utils/format'
import { compareDates, parseJalaliInput, toGregorian } from '../utils/jalali'
import JalaliCalendar from './JalaliCalendar.vue'

const props = withDefaults(defineProps<{
  modelValue: string | null
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
  placeholder: 'انتخاب تاریخ',
  disabled: false,
  clearable: true,
  showTodayButton: true,
  disabledDates: () => [],
  digitMode: 'persian',
  inputClass: '', popoverClass: '', calendarClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  select: [value: string | null]
}>()

const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const open = ref(false)
const draft = ref('')
const display = computed(() => props.modelValue ? formatJalaliDate(props.modelValue, { digitMode: props.digitMode }) : '')
watch(display, value => { draft.value = value }, { immediate: true })
useOutsideClick(root, () => { open.value = false; draft.value = display.value })

const selectable = (iso: string) => !props.disabledDates.includes(iso)
  && (!props.minDate || compareDates(iso, props.minDate) >= 0)
  && (!props.maxDate || compareDates(iso, props.maxDate) <= 0)

function update(value: string | null) {
  emit('update:modelValue', value)
  emit('select', value)
  open.value = false
}
function commitDraft() {
  if (!draft.value.trim()) return props.clearable ? update(null) : undefined
  const parsed = parseJalaliInput(draft.value)
  if (parsed) {
    const iso = toGregorian(parsed.year, parsed.month, parsed.day)
    if (selectable(iso)) update(iso)
  }
  draft.value = display.value
}
function chooseToday() {
  const today = todayDateOnly()
  if (selectable(today)) update(today)
}
async function show() {
  if (props.disabled) return
  open.value = true
  await nextTick()
}
</script>

<template>
  <div ref="root" class="relative inline-block w-full max-w-xs [font-family:Noto_Sans_Arabic_Variable,Tahoma,sans-serif]" dir="rtl" @keydown.esc="open = false">
    <div class="relative">
      <input
        ref="input"
        v-model="draft"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-expanded="open"
        aria-haspopup="dialog"
        aria-label="تاریخ جلالی"
        :class="['w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-16 text-right text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100', inputClass]"
        @focus="show"
        @click="show"
        @keydown.enter.prevent="commitDraft"
        @blur="draft = display"
      >
      <button v-if="clearable && modelValue && !disabled" type="button" class="absolute left-9 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500" aria-label="پاک کردن تاریخ" @click.stop="update(null)">×</button>
      <button type="button" :disabled="disabled" class="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:text-slate-300" aria-label="باز کردن تقویم" @click="open ? open = false : show()">▣</button>
    </div>
    <div v-if="open" role="dialog" aria-label="انتخاب تاریخ" :class="['absolute right-0 z-50 mt-2', popoverClass]">
      <JalaliCalendar
        :model-value="modelValue"
        :display-date="modelValue"
        :min-date="minDate"
        :max-date="maxDate"
        :disabled-dates="disabledDates"
        :digit-mode="digitMode"
        :calendar-class="calendarClass"
        @select="update"
      >
        <template v-if="showTodayButton" #footer>
          <button type="button" class="rounded-md px-2 py-1 text-xs font-medium text-teal-700 outline-none hover:bg-teal-50 focus:ring-2 focus:ring-teal-500" @click="chooseToday">امروز</button>
        </template>
      </JalaliCalendar>
    </div>
  </div>
</template>
