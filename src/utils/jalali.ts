import { dateOnlyToUtcDay, formatDateOnly, parseDateOnly, utcDayToDateOnly } from './dateOnly'
import { toLatinDigits } from './digits'

export interface JalaliDate { year: number; month: number; day: number }
export interface GregorianDate { year: number; month: number; day: number }

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]
const div = (a: number, b: number) => Math.trunc(a / b)
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b

function jalCal(jy: number, withoutLeap = false): { leap: number; gy: number; march: number } {
  const bl = BREAKS.length
  const gy = jy + 621
  let leapJ = -14
  let jp = BREAKS[0]
  let jump = 0
  if (jy < jp || jy >= BREAKS[bl - 1]) throw new RangeError(`Invalid Jalali year ${jy}`)
  for (let i = 1; i < bl; i++) {
    const jm = BREAKS[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  let n = jy - jp
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ++
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG
  if (withoutLeap) return { leap: 0, gy, march }
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4
  return { leap, gy, march }
}

function g2d(gy: number, gm: number, gd: number): number {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
  d += div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408
  d -= div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) - 752
  return d
}

function d2g(jdn: number): GregorianDate {
  let j = 4 * jdn + 139361631
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const day = div(mod(i, 153), 5) + 1
  const month = mod(div(i, 153), 12) + 1
  const year = div(j, 1461) - 100100 + div(8 - month, 6)
  return { year, month, day }
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy, true)
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

function d2j(jdn: number): JalaliDate {
  const g = d2g(jdn)
  let jy = g.year - 621
  const r = jalCal(jy, false)
  const jdn1f = g2d(g.year, 3, r.march)
  let k = jdn - jdn1f
  if (k >= 0) {
    if (k <= 185) return { year: jy, month: 1 + div(k, 31), day: mod(k, 31) + 1 }
    k -= 186
  } else {
    jy--
    k += 179
    if (r.leap === 1) k++
  }
  return { year: jy, month: 7 + div(k, 30), day: mod(k, 30) + 1 }
}

export function toJalali(value: string | Date): JalaliDate {
  let g: GregorianDate
  if (typeof value === 'string') {
    const parsed = parseDateOnly(value)
    if (!parsed) throw new RangeError(`Invalid ISO date: ${value}`)
    g = parsed
  } else {
    if (Number.isNaN(value.getTime())) throw new RangeError('Invalid Date')
    g = { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() }
  }
  return d2j(g2d(g.year, g.month, g.day))
}

export function toGregorian(year: number, month: number, day: number): string {
  if (!isValidJalaliDate(year, month, day)) throw new RangeError(`Invalid Jalali date: ${year}/${month}/${day}`)
  const g = d2g(j2d(year, month, day))
  return formatDateOnly(g.year, g.month, g.day)
}

export function isJalaliLeapYear(year: number): boolean {
  try { return jalCal(year).leap === 0 } catch { return false }
}

export function getJalaliMonthLength(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`Invalid Jalali month ${month}`)
  if (month <= 6) return 31
  if (month <= 11) return 30
  return isJalaliLeapYear(year) ? 30 : 29
}

export function isValidJalaliDate(year: number, month: number, day: number): boolean {
  if (![year, month, day].every(Number.isInteger) || year < BREAKS[0] || year >= BREAKS[BREAKS.length - 1] || month < 1 || month > 12 || day < 1) return false
  return day <= getJalaliMonthLength(year, month)
}

export function parseJalaliInput(input: string): JalaliDate | null {
  const match = toLatinDigits(input.trim()).match(/^(\d{3,4})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d{1,2})$/)
  if (!match) return null
  const value = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  return isValidJalaliDate(value.year, value.month, value.day) ? value : null
}

export function compareDates(a: string, b: string): -1 | 0 | 1 {
  const left = dateOnlyToUtcDay(a)
  const right = dateOnlyToUtcDay(b)
  return left < right ? -1 : left > right ? 1 : 0
}

export function isDateInRange(date: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  const low = compareDates(start, end) <= 0 ? start : end
  const high = low === start ? end : start
  return compareDates(date, low) >= 0 && compareDates(date, high) <= 0
}

export function addJalaliMonths(date: JalaliDate, amount: number): JalaliDate {
  if (!isValidJalaliDate(date.year, date.month, date.day) || !Number.isInteger(amount)) throw new RangeError('Invalid Jalali date or month amount')
  const total = date.year * 12 + date.month - 1 + amount
  const year = Math.floor(total / 12)
  const month = ((total % 12) + 12) % 12 + 1
  return { year, month, day: Math.min(date.day, getJalaliMonthLength(year, month)) }
}

export function addJalaliDays(date: JalaliDate, amount: number): JalaliDate {
  if (!isValidJalaliDate(date.year, date.month, date.day) || !Number.isInteger(amount)) throw new RangeError('Invalid Jalali date or day amount')
  return toJalali(utcDayToDateOnly(dateOnlyToUtcDay(toGregorian(date.year, date.month, date.day)) + amount))
}
