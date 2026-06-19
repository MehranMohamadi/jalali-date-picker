export type DigitMode = 'persian' | 'latin'

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, digit => PERSIAN_DIGITS[Number(digit)])
}

export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, digit => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
}

export function displayDigits(value: string | number, mode: DigitMode = 'persian'): string {
  return mode === 'persian' ? toPersianDigits(value) : String(value)
}
