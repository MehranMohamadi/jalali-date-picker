<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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
const input = ref<HTMLInputElement | null>(null)
const open = ref(false)
const draftStart = ref<string | null>(null)
const draftEnd = ref<string | null>(null)
const hoverDate = ref<string | null>(null)
const displayDate = ref<string | null>(props.modelValue.start ?? props.modelValue.end)
const isTouchDevice = ref(false)

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

onMounted(() => {
  isTouchDevice.value = window.matchMedia('(pointer: coarse)').matches
})

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
async function show() {
  if (props.disabled) return
  resetDraft()
  open.value = true
  await nextTick()
  if (isTouchDevice.value) input.value?.blur()
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
  <div ref="root" class="jalali-range-picker relative inline-block w-full max-w-sm [font-family:Noto_Sans_Arabic_Variable,Tahoma,sans-serif]" dir="rtl" @keydown.esc="close">
    <div class="jalali-range-picker__field relative">
      <input
        ref="input"
        type="text"
        readonly
        :inputmode="isTouchDevice ? 'none' : 'numeric'"
        :value="display"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-expanded="open"
        aria-haspopup="dialog"
        aria-label="بازه تاریخ جلالی"
        :class="['jalali-range-picker__input w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 pl-16 text-right text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100', inputClass]"
        @click="show"
        @focus="show"
      >
      <button v-if="clearable && (modelValue.start || modelValue.end) && !disabled" type="button" class="jalali-range-picker__clear absolute left-9 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500" aria-label="پاک کردن بازه" @click.stop="clear">×</button>
      <button type="button" :disabled="disabled" class="jalali-range-picker__toggle absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:text-slate-300" aria-label="باز کردن تقویم" @click="open ? close() : show()">▣</button>
    </div>
    <div v-if="open" role="dialog" aria-label="انتخاب بازه تاریخ" :class="['jalali-range-picker__popover absolute right-0 z-50 mt-2', popoverClass]">
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
          <div class="jalali-range-picker__footer flex items-center justify-between gap-2">
            <button v-if="showTodayButton" type="button" class="jalali-range-picker__today rounded-md px-2 py-1.5 text-xs font-medium text-teal-700 outline-none hover:bg-teal-50 focus:ring-2 focus:ring-teal-500" @click="chooseToday">امروز</button>
            <span v-else />
            <div class="jalali-range-picker__actions flex gap-2">
              <button type="button" class="jalali-range-picker__cancel rounded-md px-2 py-1.5 text-xs text-slate-500 outline-none hover:bg-slate-100 focus:ring-2 focus:ring-slate-400" @click="close">انصراف</button>
              <button type="button" :disabled="!draftStart || !draftEnd" class="jalali-range-picker__confirm rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white outline-none hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-300" @click="confirm">تأیید</button>
            </div>
          </div>
        </template>
      </JalaliCalendar>
    </div>
  </div>
</template>

<style scoped>
.jalali-range-picker {
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 24rem;
  font-family: 'Noto Sans Arabic Variable', Tahoma, sans-serif;
}

.jalali-range-picker__field {
  position: relative;
}

.jalali-range-picker__input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: .5rem;
  outline: 0;
  padding: .5rem 1.75rem .5rem 4rem;
  background: #fff;
  color: #1e293b;
  cursor: pointer;
  font: inherit;
  font-size: .875rem;
  text-align: right;
  transition: border-color .15s ease, box-shadow .15s ease;
}

.jalali-range-picker__input::placeholder {
  color: #94a3b8;
}

.jalali-range-picker__input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 2px #ccfbf1;
}

.jalali-range-picker__input:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
}

.jalali-range-picker__clear,
.jalali-range-picker__toggle {
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

.jalali-range-picker__clear {
  left: 2.25rem;
  color: #94a3b8;
}

.jalali-range-picker__toggle {
  left: .5rem;
  color: #0f766e;
}

.jalali-range-picker__clear:hover,
.jalali-range-picker__toggle:hover {
  background: #f0fdfa;
}

.jalali-range-picker__toggle:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.jalali-range-picker__popover {
  position: absolute;
  right: 0;
  z-index: 50;
  margin-top: .5rem;
  width: min(18rem, calc(100vw - 2rem));
}

.jalali-range-picker__footer,
.jalali-range-picker__actions {
  display: flex;
  align-items: center;
}

.jalali-range-picker__footer {
  justify-content: space-between;
  gap: .5rem;
}

.jalali-range-picker__actions {
  gap: .5rem;
}

.jalali-range-picker__today,
.jalali-range-picker__cancel,
.jalali-range-picker__confirm {
  border: 0;
  border-radius: .375rem;
  padding: .375rem .5rem;
  cursor: pointer;
  font: inherit;
  font-size: .75rem;
}

.jalali-range-picker__today {
  background: transparent;
  color: #0f766e;
  font-weight: 700;
}

.jalali-range-picker__cancel {
  background: transparent;
  color: #64748b;
}

.jalali-range-picker__confirm {
  background: #0d9488;
  color: #fff;
  font-weight: 700;
  padding-inline: .75rem;
}

.jalali-range-picker__today:hover {
  background: #f0fdfa;
}

.jalali-range-picker__cancel:hover {
  background: #f1f5f9;
}

.jalali-range-picker__confirm:hover {
  background: #0f766e;
}

.jalali-range-picker__confirm:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}
</style>
