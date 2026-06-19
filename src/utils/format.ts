import type { DigitMode } from './digits'
import { displayDigits } from './digits'
import { toJalali, type JalaliDate } from './jalali'

export const JALALI_MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'] as const
export const PERSIAN_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'] as const
export const PERSIAN_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const

export interface JalaliFormatOptions {
  digitMode?: DigitMode
  format?: 'numeric' | 'long'
}

export function formatJalaliDate(date: string | Date | JalaliDate, options: JalaliFormatOptions = {}): string {
  const value = typeof date === 'object' && !(date instanceof Date) && 'year' in date ? date : toJalali(date as string | Date)
  const mode = options.digitMode ?? 'persian'
  if (options.format === 'long') return `${displayDigits(value.day, mode)} ${JALALI_MONTH_NAMES[value.month - 1]} ${displayDigits(value.year, mode)}`
  return displayDigits(`${value.year}/${String(value.month).padStart(2, '0')}/${String(value.day).padStart(2, '0')}`, mode)
}
