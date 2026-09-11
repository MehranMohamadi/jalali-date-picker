import { describe, expect, it } from 'vitest'
import {
  buildCashflowTimeline,
  getCashflowRiskLevel,
  getPurchaseDecision,
  getRecurringNextDueDate,
  goalProgressPercent,
  goalRemainingAmount,
  suggestedMonthlySaving,
  suggestedWeeklySaving,
} from '../src/utils/budgetyarPlanning'

describe('budgetyar planning utilities', () => {
  it('calculates goal progress and remaining amount', () => {
    const goal = { targetAmount: 10_000_000, savedAmount: 2_500_000 }

    expect(goalRemainingAmount(goal)).toBe(7_500_000)
    expect(goalProgressPercent(goal)).toBe(25)
  })

  it('suggests monthly and weekly saving for a dated goal', () => {
    const goal = { targetAmount: 12_000_000, savedAmount: 0, targetDate: '1403/04/31' }

    expect(suggestedMonthlySaving(goal, '1403/01/01')).toBeLessThanOrEqual(3_000_000)
    expect(suggestedWeeklySaving(goal, '1403/01/01')).toBeLessThanOrEqual(750_000)
  })

  it('finds monthly recurring next due date and skips applied occurrences', () => {
    expect(getRecurringNextDueDate({
      amount: 1_000_000,
      type: 'expense',
      frequency: 'monthly',
      startDate: '1403/01/05',
      dueDay: 5,
      lastAppliedDate: '1403/01/05',
    }, '1403/01/01')).toBe('1403/02/05')
  })

  it('calculates quarterly and biannual recurring next due dates correctly', () => {
    expect(getRecurringNextDueDate({
      amount: 300_000,
      type: 'expense',
      frequency: 'quarterly',
      startDate: '1403/01/10',
      dueDay: 10,
      lastAppliedDate: '1403/01/10',
    }, '1403/01/01')).toBe('1403/04/10')

    expect(getRecurringNextDueDate({
      amount: 600_000,
      type: 'expense',
      frequency: 'biannual',
      startDate: '1403/02/15',
      dueDay: 15,
      lastAppliedDate: '1403/02/15',
    }, '1403/02/01')).toBe('1403/08/15')
  })

  it('projects a cashflow timeline and risk level', () => {
    const days = buildCashflowTimeline({
      startDate: '1403/01/01',
      days: 3,
      openingBalance: 1_000_000,
      events: [
        { date: '1403/01/02', amount: 300_000, kind: 'expense', source: 'recurring' },
        { date: '1403/01/03', amount: 900_000, kind: 'expense', source: 'installment' },
      ],
    })

    expect(days.at(-1)?.projectedBalance).toBe(-200_000)
    expect(getCashflowRiskLevel(days)).toBe('danger')
  })

  it('scores risky purchases lower', () => {
    const result = getPurchaseDecision({
      amount: 2_000_000,
      categoryBudget: 1_000_000,
      categorySpent: 800_000,
      weeklyBudget: 1_000_000,
      weeklySpent: 900_000,
      projectedBalance: 1_000_000,
      safeDailySpend: 100_000,
      isEssential: false,
      nonEssentialSpending: 2_000_000,
    })

    expect(result.level).toBe('risky')
    expect(result.score).toBeLessThan(45)
  })
})
