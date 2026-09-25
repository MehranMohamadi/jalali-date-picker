import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBudgetyar } from '../playground/composables/useBudgetyar'

const app = useBudgetyar()

describe('credit balance correction', () => {
  beforeEach(() => {
    app.transactions.value = []
    app.creditAdjustments.value = {}
    app.installments.value = []
    vi.stubGlobal('window', { confirm: vi.fn(() => true), setTimeout: vi.fn() })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('removes an incorrect open balance without removing expenses or transactions', () => {
    const month = app.todayKey.value.slice(0, 7)
    app.transactions.value = [{
      id: 1,
      type: 'expense',
      title: 'خرید آزمایشی',
      amount: 100,
      date: app.todayKey.value,
      category: 'other',
      paymentMethod: 'credit',
    }]

    const expense = app.totalExpense.value
    const cash = app.cashBeforeCreditPayment.value
    expect(app.creditExpense.value).toBe(100)
    expect(app.balanceAfterCommitments.value).toBe(-100)

    app.ignoreCreditMonth(month)
    expect(app.creditMonths.value[0]).toMatchObject({ purchases: 100, paid: 0, ignored: 100, remaining: 0 })
    expect(app.creditExpense.value).toBe(0)
    expect(app.balanceAfterCommitments.value).toBe(0)
    expect(app.balanceDeductionBreakdown.value.some((item) => item.creditMonth === month)).toBe(false)
    expect(app.totalExpense.value).toBe(expense)
    expect(app.cashBeforeCreditPayment.value).toBe(cash)
    expect(app.transactions.value).toHaveLength(1)
    expect(JSON.parse(app.buildBackupJson()).creditAdjustments).toEqual({ [month]: 100 })

    app.transactions.value.push({ ...app.transactions.value[0]!, id: 2, amount: 50 })
    expect(app.creditMonths.value[0]?.remaining).toBe(50)
    expect(app.balanceDeductionBreakdown.value.find((item) => item.creditMonth === month)?.amount).toBe(50)

    app.restoreIgnoredCredit(month)
    expect(app.creditExpense.value).toBe(150)
  })
})
