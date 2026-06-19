import { describe, expect, it } from 'vitest'
import { compareDates, isDateInRange } from '../src/utils/jalali'

describe('date-only range helpers', () => {
  it('compares ISO dates chronologically', () => {
    expect(compareDates('2024-03-19', '2024-03-20')).toBe(-1)
    expect(compareDates('2024-03-20', '2024-03-20')).toBe(0)
    expect(compareDates('2024-03-21', '2024-03-20')).toBe(1)
  })

  it('includes both endpoints and accepts reversed bounds', () => {
    expect(isDateInRange('2024-03-20', '2024-03-20', '2024-03-22')).toBe(true)
    expect(isDateInRange('2024-03-21', '2024-03-22', '2024-03-20')).toBe(true)
    expect(isDateInRange('2024-03-23', '2024-03-20', '2024-03-22')).toBe(false)
    expect(isDateInRange('2024-03-21', null, '2024-03-22')).toBe(false)
  })
})
