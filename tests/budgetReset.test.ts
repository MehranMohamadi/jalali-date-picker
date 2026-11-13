import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBudgetyar } from '../playground/composables/useBudgetyar'

describe('reset budget amounts', () => {
  const app = useBudgetyar()

  beforeEach(() => {
    app.confirmDialog.unregisterUi()
    app.budgets.value = [
      { category: 'food', budget: 500000 },
      { category: 'custom-test', budget: 120000 },
      { category: 'other', budget: 0 },
    ]
    vi.stubGlobal('window', { confirm: vi.fn(() => true), setTimeout: vi.fn() })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('zeros all amounts while preserving budget entries and other finance data', async () => {
    const categories = structuredClone(app.categories.value.map((item) => ({ ...item })))
    const transactions = JSON.stringify(app.transactions.value)
    const tags = JSON.stringify(app.tags.value)
    const categoryKeys = app.budgets.value.map((item) => item.category)

    await app.resetBudgetAmounts()

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(app.budgets.value).toEqual(categoryKeys.map((category) => ({ category, budget: 0 })))
    expect(app.totalBudget.value).toBe(0)
    expect(app.categories.value).toEqual(categories)
    expect(JSON.stringify(app.transactions.value)).toBe(transactions)
    expect(JSON.stringify(app.tags.value)).toBe(tags)
    expect(JSON.parse(app.buildBackupJson()).budgets).toEqual(app.budgets.value)
  })

  it('keeps all amounts when the confirmation is cancelled', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const original = app.budgets.value.map((item) => ({ ...item }))

    await app.resetBudgetAmounts()

    expect(app.budgets.value).toEqual(original)
  })
})
