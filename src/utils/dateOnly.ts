export interface DateOnlyParts {
  year: number
  month: number
  day: number
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseDateOnly(value: string): DateOnlyParts | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { year, month, day }
}

export function formatDateOnly(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function dateToDateOnly(date: Date): string {
  return formatDateOnly(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function todayDateOnly(): string {
  return dateToDateOnly(new Date())
}

export function dateOnlyToUtcDay(value: string): number {
  const parts = parseDateOnly(value)
  if (!parts) throw new RangeError(`Invalid ISO date: ${value}`)
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000)
}

export function utcDayToDateOnly(day: number): string {
  const date = new Date(day * 86400000)
  return formatDateOnly(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}
