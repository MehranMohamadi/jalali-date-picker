import { describe, expect, it } from 'vitest'
import {
  addJalaliDays,
  addJalaliMonths,
  getJalaliMonthLength,
  isJalaliLeapYear,
  isValidJalaliDate,
  parseJalaliInput,
  toGregorian,
  toJalali,
} from '../src/utils/jalali'

describe('Jalali conversion', () => {
  it.each([
    ['2024-03-20', { year: 1403, month: 1, day: 1 }],
    ['2023-03-21', { year: 1402, month: 1, day: 1 }],
    ['2021-03-21', { year: 1400, month: 1, day: 1 }],
    ['2016-03-20', { year: 1395, month: 1, day: 1 }],
    ['2025-03-20', { year: 1403, month: 12, day: 30 }],
    ['2025-03-21', { year: 1404, month: 1, day: 1 }],
  ])('converts %s', (iso, jalali) => expect(toJalali(iso)).toEqual(jalali))

  it('converts Jalali back to Gregorian ISO', () => {
    expect(toGregorian(1403, 1, 1)).toBe('2024-03-20')
    expect(toGregorian(1404, 1, 1)).toBe('2025-03-21')
    expect(toGregorian(1399, 12, 30)).toBe('2021-03-20')
  })

  it('round trips without timezone-sensitive Date parsing', () => {
    const values = ['1980-01-01', '2000-02-29', '2024-03-20', '2030-12-31']
    for (const iso of values) {
      const j = toJalali(iso)
      expect(toGregorian(j.year, j.month, j.day)).toBe(iso)
    }
  })
})

describe('Jalali calendar rules', () => {
  it('detects leap years and Esfand length', () => {
    expect(isJalaliLeapYear(1399)).toBe(true)
    expect(isJalaliLeapYear(1400)).toBe(false)
    expect(isJalaliLeapYear(1403)).toBe(true)
    expect(getJalaliMonthLength(1403, 12)).toBe(30)
    expect(getJalaliMonthLength(1402, 12)).toBe(29)
  })

  it('uses correct lengths for all month groups', () => {
    expect(getJalaliMonthLength(1402, 1)).toBe(31)
    expect(getJalaliMonthLength(1402, 6)).toBe(31)
    expect(getJalaliMonthLength(1402, 7)).toBe(30)
    expect(getJalaliMonthLength(1402, 11)).toBe(30)
  })

  it('validates and parses Latin and Persian input', () => {
    expect(isValidJalaliDate(1402, 12, 30)).toBe(false)
    expect(isValidJalaliDate(1403, 12, 30)).toBe(true)
    expect(parseJalaliInput('۱۴۰۳/۰۱/۰۲')).toEqual({ year: 1403, month: 1, day: 2 })
    expect(parseJalaliInput('1402-12-30')).toBeNull()
  })

  it('adds days and months across boundaries', () => {
    expect(addJalaliDays({ year: 1402, month: 12, day: 29 }, 1)).toEqual({ year: 1403, month: 1, day: 1 })
    expect(addJalaliMonths({ year: 1402, month: 6, day: 31 }, 1)).toEqual({ year: 1402, month: 7, day: 30 })
  })
})
