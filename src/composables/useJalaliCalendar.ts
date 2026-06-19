import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { formatDateOnly, parseDateOnly, todayDateOnly } from '../utils/dateOnly'
import { addJalaliMonths, getJalaliMonthLength, toGregorian, toJalali, type JalaliDate } from '../utils/jalali'

export interface CalendarDay {
  jalali: JalaliDate
  iso: string
  isToday: boolean
}

export function useJalaliCalendar(initialDate?: MaybeRefOrGetter<string | null | undefined>) {
  const seed = toValue(initialDate) ?? todayDateOnly()
  const parsed = parseDateOnly(seed) ? seed : todayDateOnly()
  const initial = toJalali(parsed)
  const visibleMonth = ref<JalaliDate>({ year: initial.year, month: initial.month, day: 1 })

  const days = computed<(CalendarDay | null)[]>(() => {
    const { year, month } = visibleMonth.value
    const firstIso = toGregorian(year, month, 1)
    const g = parseDateOnly(firstIso)!
    const weekday = (new Date(Date.UTC(g.year, g.month - 1, g.day)).getUTCDay() + 1) % 7
    const result: (CalendarDay | null)[] = Array.from({ length: weekday }, () => null)
    const today = todayDateOnly()
    for (let day = 1; day <= getJalaliMonthLength(year, month); day++) {
      const iso = toGregorian(year, month, day)
      result.push({ jalali: { year, month, day }, iso, isToday: iso === today })
    }
    while (result.length % 7) result.push(null)
    return result
  })

  const moveMonth = (amount: number) => { visibleMonth.value = addJalaliMonths(visibleMonth.value, amount) }
  const setMonthFromIso = (iso: string) => {
    const j = toJalali(iso)
    visibleMonth.value = { ...j, day: 1 }
  }
  const setMonth = (year: number, month: number) => { visibleMonth.value = { year, month, day: 1 } }

  return { visibleMonth, days, moveMonth, setMonth, setMonthFromIso }
}
