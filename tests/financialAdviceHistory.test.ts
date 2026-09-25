import { describe, expect, it } from 'vitest'
import { summarizeFinancialHistory } from '../src/utils/financialAdviceHistory'

describe('financial advice history', () => {
  it('includes every posted month without double-counting credit repayments', () => {
    const history = summarizeFinancialHistory([
      { date: '1405/05/10', type: 'income', amount: 1000 },
      { date: '1405/05/11', type: 'expense', amount: 200, category: 'food' },
      { date: '1405/06/01', type: 'expense', amount: 300, category: 'food', sourceType: 'manual' },
      { date: '1405/06/02', type: 'expense', amount: 100, sourceType: 'credit-payment' },
      { date: '1405/07/01', type: 'income', amount: 500 },
      { date: '1405/08/01', type: 'expense', amount: 999, category: 'other' },
    ], '1405/07/03', (date) => date)

    expect(history.allTimeIncome).toBe(1500)
    expect(history.allTimeExpense).toBe(500)
    expect(history.monthlyHistory).toEqual([
      { month: '1405/05', income: 1000, expense: 200 },
      { month: '1405/06', income: 0, expense: 300 },
      { month: '1405/07', income: 500, expense: 0 },
    ])
    expect(history.categorySpending).toEqual([{ key: 'food', spent: 500 }])
  })
})
