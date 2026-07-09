export type DebtPayoffStrategy = 'snowball' | 'avalanche'
export type FinancialHealthLevel = 'excellent' | 'good' | 'watch' | 'danger'
export type CategorizationMatchType = 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex' | 'amountRange' | 'merchant'
export type IncomeBudgetingMode = 'fixed' | 'average' | 'conservative' | 'manual'

export interface DebtLike {
  id: string
  title: string
  remainingAmount: number
  interestRateAnnual?: number
  minimumMonthlyPayment: number
  extraMonthlyPayment?: number
}

export interface DebtPayoffPlanItem {
  debtId: string
  title: string
  order: number
  monthsToPayoff: number
  totalPaid: number
  totalInterest: number
}

export interface DebtPayoffPlan {
  strategy: DebtPayoffStrategy
  monthsToPayoff: number
  totalPaid: number
  totalInterest: number
  order: DebtPayoffPlanItem[]
}

export interface RuleLike {
  matchType: CategorizationMatchType
  pattern?: string
  minAmount?: number
  maxAmount?: number
  merchantName?: string
  categoryId: string
  transactionType?: 'income' | 'expense'
  paymentMethod?: 'cash' | 'credit'
}

export interface TransactionLike {
  title: string
  amount: number
  type: 'income' | 'expense'
  description?: string
  merchantName?: string
  paymentMethod?: 'cash' | 'credit'
}

export interface IncomeSettingsLike {
  mode: IncomeBudgetingMode
  fixedMonthlyIncome?: number
  manualBudgetBase?: number
  historyMonths: 3 | 6 | 12
  safetyBufferPercent: number
  badMonthReservePercent: number
  essentialPercent: number
  savingPercent: number
  flexiblePercent: number
}

export interface IrregularIncomeBudget {
  averageMonthlyIncome: number
  lowestRecentMonthlyIncome: number
  highestRecentMonthlyIncome: number
  incomeVolatilityPercent: number
  recommendedBudgetBase: number
  recommendedEssentialBudget: number
  recommendedSavingBudget: number
  recommendedFlexibleBudget: number
  badMonthReserveSuggestion: number
  warnings: string[]
}

export interface FinancialHealthInput {
  monthlyIncome: number
  monthlyExpense: number
  monthlySavings: number
  totalBudget: number
  overBudgetCategoryCount: number
  categoryCount: number
  monthlyDebtPayments: number
  projectedBalance: number
  nonEssentialExpense: number
  goalsSaved?: number
}

export interface FinancialHealthScore {
  totalScore: number
  level: FinancialHealthLevel
  items: Array<{
    key: string
    title: string
    score: number
    weight: number
    message: string
    suggestion: string
  }>
  strengths: string[]
  warnings: string[]
  suggestions: string[]
  calculatedAt: string
}

export const FINANCIAL_HEALTH_WEIGHTS = {
  savingsRate: 25,
  budgetDiscipline: 20,
  debtPressure: 20,
  cashflowSafety: 15,
  nonEssentialSpending: 10,
  assetGrowth: 10,
} as const

export function calculateDebtPayoffPlan(debts: DebtLike[], strategy: DebtPayoffStrategy): DebtPayoffPlan {
  const active = debts
    .filter((debt) => debt.remainingAmount > 0)
    .map((debt) => ({ ...debt, balance: debt.remainingAmount }))
    .sort((a, b) =>
      strategy === 'snowball'
        ? a.remainingAmount - b.remainingAmount
        : (b.interestRateAnnual ?? 0) - (a.interestRateAnnual ?? 0),
    )

  let rolledPayment = active.reduce((sum, debt) => sum + Math.max(0, debt.extraMonthlyPayment ?? 0), 0)
  let month = 0
  let totalPaid = 0
  let totalInterest = 0
  const order: DebtPayoffPlanItem[] = []

  for (const debt of active) {
    let balance = debt.balance
    let debtPaid = 0
    let debtInterest = 0
    let debtMonths = 0
    const monthlyRate = Math.max(0, debt.interestRateAnnual ?? 0) / 100 / 12
    let payment = Math.max(1, debt.minimumMonthlyPayment + rolledPayment)

    while (balance > 0 && debtMonths < 600) {
      const interest = Math.round(balance * monthlyRate)
      const principalPayment = Math.min(balance + interest, payment)
      balance = Math.max(0, balance + interest - principalPayment)
      debtPaid += principalPayment
      debtInterest += interest
      debtMonths += 1
      month += 1

      if (payment <= interest && balance > 0) {
        payment = interest + 1
      }
    }

    rolledPayment += debt.minimumMonthlyPayment
    totalPaid += debtPaid
    totalInterest += debtInterest
    order.push({
      debtId: debt.id,
      title: debt.title,
      order: order.length + 1,
      monthsToPayoff: debtMonths,
      totalPaid: debtPaid,
      totalInterest: debtInterest,
    })
  }

  return { strategy, monthsToPayoff: month, totalPaid, totalInterest, order }
}

export function matchCategorizationRule(rule: RuleLike, transaction: TransactionLike) {
  if (rule.transactionType && rule.transactionType !== transaction.type) return false
  if (rule.paymentMethod && rule.paymentMethod !== transaction.paymentMethod) return false

  const text = `${transaction.title} ${transaction.description ?? ''} ${transaction.merchantName ?? ''}`.toLocaleLowerCase()
  const pattern = (rule.pattern ?? rule.merchantName ?? '').toLocaleLowerCase()

  if (rule.matchType === 'amountRange') {
    return transaction.amount >= (rule.minAmount ?? 0) && transaction.amount <= (rule.maxAmount ?? Number.MAX_SAFE_INTEGER)
  }

  if (rule.matchType === 'merchant') {
    return Boolean(rule.merchantName && (transaction.merchantName?.toLocaleLowerCase().includes(rule.merchantName.toLocaleLowerCase()) || text.includes(rule.merchantName.toLocaleLowerCase())))
  }

  if (!pattern) return false
  if (rule.matchType === 'equals') return text.trim() === pattern
  if (rule.matchType === 'startsWith') return text.trim().startsWith(pattern)
  if (rule.matchType === 'endsWith') return text.trim().endsWith(pattern)
  if (rule.matchType === 'regex') {
    try {
      return new RegExp(rule.pattern ?? '', 'i').test(text)
    } catch {
      return false
    }
  }

  return text.includes(pattern)
}

export function calculateIrregularIncomeBudget(monthlyIncome: number[], settings: IncomeSettingsLike): IrregularIncomeBudget {
  const history = monthlyIncome.slice(0, settings.historyMonths)
  const average = history.length ? Math.round(sum(history) / history.length) : 0
  const lowest = history.length ? Math.min(...history) : 0
  const highest = history.length ? Math.max(...history) : 0
  const volatility = average ? Math.round(((highest - lowest) / average) * 100) : 0
  const selectedBase =
    settings.mode === 'fixed'
      ? settings.fixedMonthlyIncome ?? average
      : settings.mode === 'manual'
        ? settings.manualBudgetBase ?? average
        : settings.mode === 'conservative'
          ? lowest
          : average
  const budgetBase = Math.max(0, Math.round(selectedBase * (1 - settings.safetyBufferPercent / 100)))
  const warnings: string[] = []
  if (settings.essentialPercent + settings.savingPercent + settings.flexiblePercent !== 100) {
    warnings.push('budget-percent-total')
  }
  if (volatility >= 35) warnings.push('high-income-volatility')

  return {
    averageMonthlyIncome: average,
    lowestRecentMonthlyIncome: lowest,
    highestRecentMonthlyIncome: highest,
    incomeVolatilityPercent: volatility,
    recommendedBudgetBase: budgetBase,
    recommendedEssentialBudget: Math.round((budgetBase * settings.essentialPercent) / 100),
    recommendedSavingBudget: Math.round((budgetBase * settings.savingPercent) / 100),
    recommendedFlexibleBudget: Math.round((budgetBase * settings.flexiblePercent) / 100),
    badMonthReserveSuggestion: Math.round((budgetBase * settings.badMonthReservePercent) / 100),
    warnings,
  }
}

export function calculateFinancialHealthScore(input: FinancialHealthInput, calculatedAt: string): FinancialHealthScore {
  const income = Math.max(input.monthlyIncome, 1)
  const expense = Math.max(input.monthlyExpense, 0)
  const savingsRate = input.monthlySavings / income
  const debtRatio = input.monthlyDebtPayments / income
  const nonEssentialRatio = expense ? input.nonEssentialExpense / expense : 0
  const overBudgetRatio = input.categoryCount ? input.overBudgetCategoryCount / input.categoryCount : 0

  const itemInputs = [
    {
      key: 'savingsRate',
      title: 'نرخ پس‌انداز',
      score: clampScore((savingsRate / 0.2) * 100),
      weight: FINANCIAL_HEALTH_WEIGHTS.savingsRate,
      good: 'نرخ پس‌انداز این ماه خوب است.',
      bad: 'نرخ پس‌انداز پایین است.',
      suggestion: 'اول ماه بخشی از درآمد را کنار بگذار.',
    },
    {
      key: 'budgetDiscipline',
      title: 'پایبندی به بودجه',
      score: clampScore((1 - overBudgetRatio) * 100),
      weight: FINANCIAL_HEALTH_WEIGHTS.budgetDiscipline,
      good: 'بودجه‌ها خوب کنترل شده‌اند.',
      bad: 'چند دسته از بودجه عبور کرده‌اند.',
      suggestion: 'دسته‌های پرمصرف را کم کن.',
    },
    {
      key: 'debtPressure',
      title: 'فشار بدهی',
      score: debtRatio <= 0.2 ? 100 : debtRatio <= 0.35 ? 65 : 25,
      weight: FINANCIAL_HEALTH_WEIGHTS.debtPressure,
      good: 'فشار بدهی قابل مدیریت است.',
      bad: 'پرداخت بدهی فشار زیادی دارد.',
      suggestion: 'پرداخت اضافه را روی یک بدهی متمرکز کن.',
    },
    {
      key: 'cashflowSafety',
      title: 'امنیت جریان نقدی',
      score: input.projectedBalance > 0 ? 100 : 20,
      weight: FINANCIAL_HEALTH_WEIGHTS.cashflowSafety,
      good: 'مانده پیش‌بینی‌شده مثبت است.',
      bad: 'احتمال کمبود نقدینگی وجود دارد.',
      suggestion: 'خرج‌های غیرضروری را تا سررسیدها عقب بینداز.',
    },
    {
      key: 'nonEssentialSpending',
      title: 'خرج غیرضروری',
      score: nonEssentialRatio <= 0.2 ? 100 : nonEssentialRatio <= 0.35 ? 65 : 25,
      weight: FINANCIAL_HEALTH_WEIGHTS.nonEssentialSpending,
      good: 'خرج غیرضروری کنترل شده است.',
      bad: 'خرج غیرضروری بالاست.',
      suggestion: 'برای خریدهای غیرضروری ۷۲ ساعت صبر کن.',
    },
    {
      key: 'assetGrowth',
      title: 'رشد دارایی',
      score: input.monthlySavings > 0 || (input.goalsSaved ?? 0) > 0 ? 85 : 55,
      weight: FINANCIAL_HEALTH_WEIGHTS.assetGrowth,
      good: 'پس‌انداز یا هدف مالی فعال داری.',
      bad: 'رشد دارایی کم است.',
      suggestion: 'یک هدف پس‌انداز کوچک تعریف کن.',
    },
  ]

  const items = itemInputs.map((item) => ({
    key: item.key,
    title: item.title,
    score: Math.round(item.score),
    weight: item.weight,
    message: item.score >= 70 ? item.good : item.bad,
    suggestion: item.suggestion,
  }))
  const totalScore = Math.round(items.reduce((total, item) => total + (item.score * item.weight) / 100, 0))
  const strengths = items.filter((item) => item.score >= 80).map((item) => item.message)
  const warnings = items.filter((item) => item.score < 50).map((item) => item.message)
  const suggestions = items.filter((item) => item.score < 75).map((item) => item.suggestion)

  return {
    totalScore,
    level: getFinancialHealthLevel(totalScore),
    items,
    strengths,
    warnings,
    suggestions,
    calculatedAt,
  }
}

export function getFinancialHealthLevel(score: number): FinancialHealthLevel {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'watch'
  return 'danger'
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value))
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}
