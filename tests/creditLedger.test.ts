import { describe, expect, it } from 'vitest'
import { applyCreditAdjustments, getCreditMonths } from '../src/utils/creditLedger'

describe('monthly credit ledger', () => {
  it('keeps a previous month open until its linked settlement is recorded', () => {
    const purchases = [
      { type: 'expense' as const, amount: 100, date: '1405/06/20', paymentMethod: 'credit' },
      { type: 'expense' as const, amount: 80, date: '1405/07/10', paymentMethod: 'credit' },
    ]
    expect(getCreditMonths(purchases).map((item) => item.remaining)).toEqual([100, 80])

    const payment = { type: 'expense' as const, amount: 60, date: '1405/07/29', sourceType: 'credit-payment', sourceId: '1405/06' }
    expect(getCreditMonths([...purchases, payment])).toEqual([
      { month: '1405/06', purchases: 100, paid: 60, remaining: 40 },
      { month: '1405/07', purchases: 80, paid: 0, remaining: 80 },
    ])
  })

  it('keeps older unlinked settlements with their payment month first', () => {
    const ledger = getCreditMonths([
      { type: 'expense', amount: 100, date: '1405/06/20', paymentMethod: 'credit' },
      { type: 'expense', amount: 80, date: '1405/07/10', paymentMethod: 'credit' },
      { type: 'expense', amount: 120, date: '1405/07/30', sourceType: 'credit-payment' },
    ])
    expect(ledger.map((item) => item.remaining)).toEqual([60, 0])
  })

  it('excludes only a recorded correction from open credit, without changing purchases or payments', () => {
    const months = getCreditMonths([
      { type: 'expense', amount: 100, date: '1405/06/20', paymentMethod: 'credit' },
      { type: 'expense', amount: 80, date: '1405/07/10', paymentMethod: 'credit' },
    ])
    expect(applyCreditAdjustments(months, { '1405/06': 100 })).toEqual([
      { month: '1405/06', purchases: 100, paid: 0, ignored: 100, remaining: 0 },
      { month: '1405/07', purchases: 80, paid: 0, ignored: 0, remaining: 80 },
    ])
    expect(months[0]?.remaining).toBe(100)
    expect(applyCreditAdjustments([{ ...months[0]!, remaining: 150 }], { '1405/06': 100 })[0]?.remaining).toBe(50)
  })
})
