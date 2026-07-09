import { addJalaliDays, addJalaliMonths, getJalaliMonthLength, parseJalaliInput, toGregorian } from './jalali'

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type CashflowRiskLevel = 'safe' | 'watch' | 'danger'
export type PurchaseDecisionLevel = 'safe' | 'caution' | 'risky'

export interface PlanningGoalLike {
  targetAmount: number
  savedAmount: number
  targetDate?: string
}

export interface RecurringItemLike {
  amount: number
  type: 'income' | 'expense'
  frequency: RecurringFrequency
  startDate: string
  endDate?: string
  dueDay?: number
  lastAppliedDate?: string
  skippedDates?: string[]
  isActive?: boolean
}

export interface CashflowEventLike {
  date: string
  amount: number
  kind: 'income' | 'expense'
  source?: 'recurring' | 'installment' | 'budget'
}

export interface CashflowForecastDay {
  date: string
  income: number
  expense: number
  recurringIncome: number
  recurringExpense: number
  installmentExpense: number
  plannedBudgetExpense: number
  projectedBalance: number
  warnings: string[]
}

export interface PurchaseDecisionInput {
  amount: number
  categoryBudget: number
  categorySpent: number
  weeklyBudget: number
  weeklySpent: number
  projectedBalance: number
  safeDailySpend: number
  creditLimit?: number
  creditUsed?: number
  paymentMethod?: 'cash' | 'credit'
  isEssential?: boolean
  nonEssentialSpending?: number
  highPriorityGoalRemaining?: number
  hasNearDueObligation?: boolean
}

export interface PurchaseDecisionResult {
  level: PurchaseDecisionLevel
  score: number
  suggestions: string[]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function normalizePlanningDate(value: string) {
  const parsed = parseJalaliInput(value)
  if (!parsed) return ''

  return `${parsed.year}/${String(parsed.month).padStart(2, '0')}/${String(parsed.day).padStart(2, '0')}`
}

export function goalRemainingAmount(goal: PlanningGoalLike) {
  return Math.max(0, goal.targetAmount - goal.savedAmount)
}

export function goalProgressPercent(goal: PlanningGoalLike) {
  if (goal.targetAmount <= 0) return 0

  return Math.min(100, Math.max(0, Math.round((goal.savedAmount / goal.targetAmount) * 100)))
}

export function suggestedMonthlySaving(goal: PlanningGoalLike, today: string) {
  const remaining = goalRemainingAmount(goal)
  const months = Math.max(1, Math.ceil(daysBetween(today, goal.targetDate || today) / 30))

  return Math.ceil(remaining / months)
}

export function suggestedWeeklySaving(goal: PlanningGoalLike, today: string) {
  const remaining = goalRemainingAmount(goal)
  const weeks = Math.max(1, Math.ceil(daysBetween(today, goal.targetDate || today) / 7))

  return Math.ceil(remaining / weeks)
}

export function getRecurringNextDueDate(item: RecurringItemLike, today: string) {
  if (item.isActive === false) return ''

  const start = normalizePlanningDate(item.startDate)
  const current = normalizePlanningDate(today)
  if (!start || !current) return ''

  let cursor = nextOccurrenceOnOrAfter(item, start)
  const end = item.endDate ? normalizePlanningDate(item.endDate) : ''

  for (let guard = 0; guard < 500 && cursor; guard += 1) {
    if (end && cursor > end) return ''
    if (cursor >= current && cursor !== item.lastAppliedDate && !item.skippedDates?.includes(cursor)) return cursor
    cursor = addFrequency(cursor, item.frequency, item.dueDay)
  }

  return ''
}

export function isRecurringDueSoon(item: RecurringItemLike, today: string, daysBefore: number) {
  const nextDue = getRecurringNextDueDate(item, today)
  if (!nextDue) return false

  const diff = daysBetween(today, nextDue)
  return diff >= 0 && diff <= Math.max(0, daysBefore)
}

export function buildCashflowTimeline(options: {
  startDate: string
  days: number
  openingBalance: number
  events: CashflowEventLike[]
  lowBalanceThreshold?: number
}) {
  const start = normalizePlanningDate(options.startDate)
  if (!start) return []

  let projectedBalance = options.openingBalance
  const threshold = options.lowBalanceThreshold ?? 0

  return Array.from({ length: Math.max(0, options.days) }, (_, index): CashflowForecastDay => {
    const date = addDaysToKey(start, index)
    const dayEvents = options.events.filter((event) => normalizePlanningDate(event.date) === date)
    const income = sum(dayEvents.filter((event) => event.kind === 'income').map((event) => event.amount))
    const expense = sum(dayEvents.filter((event) => event.kind === 'expense').map((event) => event.amount))

    projectedBalance += income - expense

    const warnings: string[] = []
    if (projectedBalance < 0) warnings.push('negative-balance')
    else if (projectedBalance <= threshold) warnings.push('low-balance')

    return {
      date,
      income,
      expense,
      recurringIncome: sum(dayEvents.filter((event) => event.source === 'recurring' && event.kind === 'income').map((event) => event.amount)),
      recurringExpense: sum(dayEvents.filter((event) => event.source === 'recurring' && event.kind === 'expense').map((event) => event.amount)),
      installmentExpense: sum(dayEvents.filter((event) => event.source === 'installment').map((event) => event.amount)),
      plannedBudgetExpense: sum(dayEvents.filter((event) => event.source === 'budget').map((event) => event.amount)),
      projectedBalance,
      warnings,
    }
  })
}

export function getCashflowRiskLevel(days: CashflowForecastDay[], creditExceeded = false): CashflowRiskLevel {
  if (creditExceeded || days.some((day) => day.projectedBalance < 0)) return 'danger'
  if (days.some((day) => day.warnings.length)) return 'watch'

  return 'safe'
}

export function getPurchaseDecision(input: PurchaseDecisionInput): PurchaseDecisionResult {
  let score = 100
  const suggestions: string[] = []
  const categoryRemaining = input.categoryBudget - input.categorySpent

  if (input.amount > categoryRemaining) {
    score -= 25
    suggestions.push('reduce-amount')
  }

  if (input.weeklySpent + input.amount > input.weeklyBudget) {
    score -= 20
    suggestions.push('delay-purchase')
  }

  if (input.projectedBalance - input.amount < 0 || input.safeDailySpend - input.amount < 0) {
    score -= 30
    suggestions.push('protect-cashflow')
  }

  if (input.paymentMethod === 'credit' && (input.creditUsed ?? 0) + input.amount > (input.creditLimit ?? 0) * 0.85) {
    score -= 20
    suggestions.push('prefer-cash')
  }

  if (input.isEssential === false && (input.nonEssentialSpending ?? 0) > input.weeklyBudget) {
    score -= 15
    suggestions.push('wait-72-hours')
  }

  if ((input.highPriorityGoalRemaining ?? 0) > 0 && input.amount > input.safeDailySpend * 7) {
    score -= 15
    suggestions.push('protect-goals')
  }

  if (input.hasNearDueObligation) {
    score -= 10
    suggestions.push('check-due-payments')
  }

  score = Math.max(0, Math.min(100, score))

  return {
    level: score >= 75 ? 'safe' : score >= 45 ? 'caution' : 'risky',
    score,
    suggestions: [...new Set(suggestions)],
  }
}

function nextOccurrenceOnOrAfter(item: RecurringItemLike, date: string) {
  if (item.frequency !== 'monthly') return date

  const parsed = parseJalaliInput(date)
  if (!parsed) return ''

  const dueDay = Math.min(
    Math.max(1, Math.trunc(item.dueDay || parsed.day)),
    getJalaliMonthLength(parsed.year, parsed.month),
  )

  return normalizePlanningDate(`${parsed.year}/${parsed.month}/${dueDay}`)
}

function addFrequency(date: string, frequency: RecurringFrequency, dueDay?: number) {
  const parsed = parseJalaliInput(date)
  if (!parsed) return ''

  if (frequency === 'daily') return addDaysToKey(date, 1)
  if (frequency === 'weekly') return addDaysToKey(date, 7)
  if (frequency === 'yearly') return normalizePlanningDate(`${parsed.year + 1}/${parsed.month}/${Math.min(parsed.day, getJalaliMonthLength(parsed.year + 1, parsed.month))}`)

  const next = addJalaliMonths(parsed, 1)
  const nextDay = Math.min(Math.max(1, Math.trunc(dueDay || parsed.day)), getJalaliMonthLength(next.year, next.month))
  return normalizePlanningDate(`${next.year}/${next.month}/${nextDay}`)
}

function addDaysToKey(date: string, amount: number) {
  const parsed = parseJalaliInput(date)
  if (!parsed) return ''

  const next = addJalaliDays(parsed, amount)
  return normalizePlanningDate(`${next.year}/${next.month}/${next.day}`)
}

function daysBetween(start: string, end: string) {
  const startDate = parseJalaliInput(start)
  const endDate = parseJalaliInput(end)
  if (!startDate || !endDate) return 0

  const startIso = toGregorian(startDate.year, startDate.month, startDate.day)
  const endIso = toGregorian(endDate.year, endDate.month, endDate.day)
  const startUtc = Date.parse(`${startIso}T00:00:00.000Z`)
  const endUtc = Date.parse(`${endIso}T00:00:00.000Z`)

  return Math.max(0, Math.ceil((endUtc - startUtc) / DAY_MS))
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}
