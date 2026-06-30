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
  <div ref="root" class="jalali-date-picker relative inline-block w-full max-w-xs [font-family:Noto_Sans_Arabic_Variable,Tahoma,sans-serif]" dir="rtl" @keydown.esc="open = false">
    <div class="jalali-date-picker__field relative">
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
        :class="['jalali-date-picker__input w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-16 text-right text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100', inputClass]"
        @focus="show"
        @click="show"
        @keydown.enter.prevent="commitDraft"
        @blur="draft = display"
      >
      <button v-if="clearable && modelValue && !disabled" type="button" class="jalali-date-picker__clear absolute left-9 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500" aria-label="پاک کردن تاریخ" @click.stop="update(null)">×</button>
      <button type="button" :disabled="disabled" class="jalali-date-picker__toggle absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:text-slate-300" aria-label="باز کردن تقویم" @click="open ? open = false : show()">▣</button>
    </div>
    <div v-if="open" role="dialog" aria-label="انتخاب تاریخ" :class="['jalali-date-picker__popover absolute right-0 z-50 mt-2', popoverClass]">
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
          <button type="button" class="jalali-date-picker__today rounded-md px-2 py-1 text-xs font-medium text-teal-700 outline-none hover:bg-teal-50 focus:ring-2 focus:ring-teal-500" @click="chooseToday">امروز</button>
        </template>
      </JalaliCalendar>
    </div>
  </div>
</template>

<style scoped>
.jalali-date-picker {
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 20rem;
  font-family: 'Noto Sans Arabic Variable', Tahoma, sans-serif;
}

.jalali-date-picker__field {
  position: relative;
}

.jalali-date-picker__input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: .5rem;
  outline: 0;
  padding: .5rem 1.75rem .5rem 4rem;
  background: #fff;
  color: #1e293b;
  font: inherit;
  font-size: .875rem;
  text-align: right;
  transition: border-color .15s ease, box-shadow .15s ease;
}

.jalali-date-picker__input::placeholder {
  color: #94a3b8;
}

.jalali-date-picker__input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 2px #ccfbf1;
}

.jalali-date-picker__input:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
}

.jalali-date-picker__clear,
.jalali-date-picker__toggle {
  position: absolute;
  top: 50%;
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  place-items: center;
  border: 0;
  border-radius: .375rem;
  padding: 0;
  background: transparent;
  transform: translateY(-50%);
  cursor: pointer;
}

.jalali-date-picker__clear {
  left: 2.25rem;
  color: #94a3b8;
}

.jalali-date-picker__toggle {
  left: .5rem;
  color: #0f766e;
}

.jalali-date-picker__clear:hover,
.jalali-date-picker__toggle:hover {
  background: #f0fdfa;
}

.jalali-date-picker__toggle:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.jalali-date-picker__popover {
  position: absolute;
  right: 0;
  z-index: 50;
  margin-top: .5rem;
  width: min(18rem, calc(100vw - 2rem));
}

.jalali-date-picker__today {
  border: 0;
  border-radius: .375rem;
  padding: .25rem .5rem;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
  font: inherit;
  font-size: .75rem;
  font-weight: 700;
}

.jalali-date-picker__today:hover {
  background: #f0fdfa;
}
</style>
