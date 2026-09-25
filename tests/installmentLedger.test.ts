import { describe, expect, it } from 'vitest'
import { getForecastInstallmentEvents, getNextUnpaidInstallmentIndex, getPaidInstallmentIndexes, setInstallmentPaid } from '../src/utils/installmentLedger'

describe('installment payment state', () => {
  it('restores legacy consecutive payments', () => {
    expect(getPaidInstallmentIndexes({ totalCount: 3, paidCount: 2 })).toEqual([0, 1])
  })

  it('reopens only the deleted occurrence, then pays it again', () => {
    const plan = { totalCount: 3, paidCount: 2 }
    const reopened = { ...plan, ...setInstallmentPaid(plan, 0, false) }
    expect(reopened.paidIndexes).toEqual([1])
    expect(getNextUnpaidInstallmentIndex(reopened)).toBe(0)
    expect(setInstallmentPaid(reopened, 0, true).paidIndexes).toEqual([0, 1])
  })

  it('includes overdue and every unpaid occurrence in the forecast window', () => {
    const events = getForecastInstallmentEvents([
      { dueDate: '1405/06/29', amount: 100 },
      { dueDate: '1405/07/29', amount: 100 },
      { dueDate: '1405/08/29', amount: 100 },
      { dueDate: '1405/10/29', amount: 100 },
    ], '1405/07/01', '1405/09/30')
    expect(events.map((item) => item.date)).toEqual(['1405/07/01', '1405/07/29', '1405/08/29'])
  })
})
