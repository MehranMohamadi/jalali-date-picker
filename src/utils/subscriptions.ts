import { dateOnlyToUtcDay } from './dateOnly'
import { parseJalaliInput, toGregorian } from './jalali'

export interface Subscription {
  id: string
  title: string
  endDate: string
}

export function restoreSubscriptions(value: unknown): Subscription[] {
  if (!Array.isArray(value)) return []
  const ids = new Set<string>()
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()
      || ids.has(item.id) || typeof item.title !== 'string' || !item.title.trim()
      || typeof item.endDate !== 'string') return []
    const date = parseJalaliInput(item.endDate)
    if (!date) return []
    ids.add(item.id)
    return [{ id: item.id, title: item.title.trim(), endDate: `${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}` }]
  })
}

export function subscriptionDaysRemaining(endDate: string, today: string): number {
  const toDay = (value: string) => {
    const date = parseJalaliInput(value)
    if (!date) throw new RangeError(`Invalid Jalali date: ${value}`)
    return dateOnlyToUtcDay(toGregorian(date.year, date.month, date.day))
  }
  return toDay(endDate) - toDay(today)
}
