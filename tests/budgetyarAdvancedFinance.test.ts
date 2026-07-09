import { describe, expect, it } from 'vitest'
import {
  calculateDebtPayoffPlan,
  calculateFinancialHealthScore,
  calculateIrregularIncomeBudget,
  matchCategorizationRule,
} from '../src/utils/budgetyarAdvancedFinance'

describe('budgetyar advanced finance utilities', () => {
  it('orders snowball payoff by smallest remaining debt', () => {
    const plan = calculateDebtPayoffPlan([
      { id: 'a', title: 'A', remainingAmount: 5_000_000, minimumMonthlyPayment: 500_000 },
      { id: 'b', title: 'B', remainingAmount: 1_000_000, minimumMonthlyPayment: 200_000 },
    ], 'snowball')

    expect(plan.order[0].debtId).toBe('b')
    expect(plan.monthsToPayoff).toBeGreaterThan(0)
  })

  it('orders avalanche payoff by highest interest', () => {
    const plan = calculateDebtPayoffPlan([
      { id: 'a', title: 'A', remainingAmount: 5_000_000, interestRateAnnual: 10, minimumMonthlyPayment: 500_000 },
      { id: 'b', title: 'B', remainingAmount: 1_000_000, interestRateAnnual: 25, minimumMonthlyPayment: 200_000 },
    ], 'avalanche')

    expect(plan.order[0].debtId).toBe('b')
  })

  it('matches categorization contains and amount rules', () => {
    expect(matchCategorizationRule(
      { matchType: 'contains', pattern: 'snapp', categoryId: 'transport', transactionType: 'expense' },
      { title: 'Snapp ride', amount: 120_000, type: 'expense' },
    )).toBe(true)

    expect(matchCategorizationRule(
      { matchType: 'amountRange', minAmount: 100_000, maxAmount: 200_000, categoryId: 'food' },
      { title: 'Lunch', amount: 150_000, type: 'expense' },
    )).toBe(true)
  })

  it('calculates conservative irregular income budget', () => {
    const budget = calculateIrregularIncomeBudget([10_000_000, 6_000_000, 8_000_000], {
      mode: 'conservative',
      historyMonths: 3,
      safetyBufferPercent: 10,
      badMonthReservePercent: 10,
      essentialPercent: 60,
      savingPercent: 20,
      flexiblePercent: 20,
    })

    expect(budget.recommendedBudgetBase).toBe(5_400_000)
    expect(budget.recommendedEssentialBudget).toBe(3_240_000)
  })

  it('calculates explainable financial health score', () => {
    const score = calculateFinancialHealthScore({
      monthlyIncome: 20_000_000,
      monthlyExpense: 14_000_000,
      monthlySavings: 6_000_000,
      totalBudget: 18_000_000,
      overBudgetCategoryCount: 0,
      categoryCount: 5,
      monthlyDebtPayments: 2_000_000,
      projectedBalance: 4_000_000,
      nonEssentialExpense: 2_000_000,
      goalsSaved: 1_000_000,
    }, '1403/01/01')

    expect(score.totalScore).toBeGreaterThanOrEqual(85)
    expect(score.level).toBe('excellent')
  })
})
