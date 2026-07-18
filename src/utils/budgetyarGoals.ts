export type GoalTrackingMode = 'FIXED_MONEY' | 'ASSET_FUNDING' | 'ASSET_HOLDING'
export type GoalTargetValuePolicy = 'NOMINAL' | 'INFLATION_INDEXED' | 'MARKET_LINKED'
export type GoalCommitmentMode = 'NONE' | 'SOFT_WARNING' | 'REQUIRE_REASON' | 'COOLING_OFF'
export type GoalTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'ASSET_PURCHASE' | 'ASSET_SALE'
export type GoalHealthLevel = 'excellent' | 'good' | 'watch' | 'danger'
export type GoalPaceLevel = 'ahead' | 'onTrack' | 'behind' | 'overfunded'

export interface GoalMarketRates {
  usd?: number
  gold18?: number
  silver?: number
  updatedAt?: string
}

export interface GoalLike {
  id: string
  title: string
  targetAmount: number
  savedAmount: number
  unit?: 'irr' | 'goldGram' | 'silverGram' | 'usd'
  trackingMode?: GoalTrackingMode
  targetQuantity?: number
  assetCode?: string
  targetValuePolicy?: GoalTargetValuePolicy
  inflationRate?: number
  baseCurrency?: 'irr' | 'usd'
  startDate?: string
  targetDate?: string
  plannedContribution?: number
  contributionFrequency?: 'none' | 'weekly' | 'monthly' | 'salary-day' | 'custom'
  commitmentMode?: GoalCommitmentMode
  coolingOffPeriod?: number
  priceSource?: string
}

export interface GoalTransactionLike {
  goalId: string
  type: GoalTransactionType
  baseAmount: number
  quantity: number
  unitPrice: number
  fee: number
  currency: 'irr' | 'usd'
  assetCode?: string
  occurredAt: string
}

export interface GoalSnapshot {
  mode: GoalTrackingMode
  currentUnitLabel: string
  targetLabel: string
  savedLabel: string
  currentMarketPrice: number | null
  currentRequiredAmount: number | null
  currentMarketValue: number | null
  netSavedAmount: number
  currentQuantity: number
  totalCost: number
  profitLoss: number
  progressPercent: number
  remainingAmount: number
  paceLevel: GoalPaceLevel
  healthLevel: GoalHealthLevel
  daysRemaining: number | null
  monthlyNeeded: number
  weeklyNeeded: number
  estimatedCompletionDate: string | null
}

export interface GoalTimelineScenario {
  baseline: GoalSnapshot
  accelerated: GoalSnapshot
  paused: GoalSnapshot
}

function daysBetween(start: string, end: string) {
  const startDate = parseJalaliDate(start)
  const endDate = parseJalaliDate(end)
  if (!startDate || !endDate) return 0

  const startParsed = parseJalaliInput(startDate)
  const endParsed = parseJalaliInput(endDate)
  if (!startParsed || !endParsed) return 0

  const startUtc = Date.parse(`${toGregorian(startParsed.year, startParsed.month, startParsed.day)}T00:00:00.000Z`)
  const endUtc = Date.parse(`${toGregorian(endParsed.year, endParsed.month, endParsed.day)}T00:00:00.000Z`)

  return Math.max(0, Math.ceil((endUtc - startUtc) / (24 * 60 * 60 * 1000)))
}

function parseJalaliDate(value: string) {
  const normalized = String(value || '').trim()
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(normalized)) return ''

  return normalized
}

function getMarketPrice(goal: GoalLike, marketRates?: GoalMarketRates | null) {
  const code = (goal.assetCode || goal.unit || '').toLowerCase()
  if (!marketRates) return null
  if (code.includes('usd')) return marketRates.usd ?? null
  if (code.includes('silver')) return marketRates.silver ?? null
  if (code.includes('gold')) return marketRates.gold18 ?? null

  return null
}

function getMode(goal: GoalLike): GoalTrackingMode {
  if (goal.trackingMode) return goal.trackingMode
  if (goal.assetCode || goal.unit === 'goldGram' || goal.unit === 'silverGram' || goal.unit === 'usd') return 'ASSET_HOLDING'

  return 'FIXED_MONEY'
}

function getEffectiveTargetAmount(goal: GoalLike, today: string) {
  const target = Math.max(0, goal.targetAmount)
  if (goal.targetValuePolicy !== 'INFLATION_INDEXED' || !goal.inflationRate || !goal.startDate || !today) return target

  const elapsedDays = daysBetween(goal.startDate, today)
  const years = elapsedDays / 365
  return target * Math.pow(1 + Math.max(0, goal.inflationRate) / 100, years)
}

function getTransactionSignedAmount(transaction: GoalTransactionLike) {
  switch (transaction.type) {
    case 'WITHDRAWAL':
    case 'TRANSFER_OUT':
      return -Math.abs(transaction.baseAmount)
    case 'ASSET_SALE':
      return Math.abs(transaction.baseAmount)
    default:
      return Math.abs(transaction.baseAmount)
  }
}

function getTransactionSignedQuantity(transaction: GoalTransactionLike) {
  switch (transaction.type) {
    case 'WITHDRAWAL':
    case 'TRANSFER_OUT':
    case 'ASSET_SALE':
      return -Math.abs(transaction.quantity)
    default:
      return Math.abs(transaction.quantity)
  }
}

function estimateCompletionDate(today: string, daysRemaining: number | null, paceLevel: GoalPaceLevel) {
  if (daysRemaining === null || paceLevel === 'overfunded') return null
  if (daysRemaining <= 0) return today

  const parsed = parseJalaliInput(today)
  if (!parsed) return null

  const next = addJalaliDays(parsed, daysRemaining)
  return `${next.year}/${String(next.month).padStart(2, '0')}/${String(next.day).padStart(2, '0')}`
}

function getPaceLevel(progressPercent: number, targetDate: string | undefined, today: string) {
  if (!targetDate) return progressPercent >= 100 ? 'overfunded' : 'onTrack'
  const remainingDays = daysBetween(today, targetDate)
  if (progressPercent >= 100) return 'overfunded'
  if (!remainingDays) return 'behind'
  if (remainingDays <= 30 && progressPercent < 50) return 'behind'
  if (progressPercent >= 80) return 'ahead'

  return 'onTrack'
}

export function calculateGoalSnapshot(goal: GoalLike, transactions: GoalTransactionLike[] = [], marketRates?: GoalMarketRates | null, today = ''): GoalSnapshot {
  const mode = getMode(goal)
  const effectiveTargetAmount = getEffectiveTargetAmount(goal, today)
  const ledger = transactions.filter((item) => item.goalId === goal.id)
  const marketPrice = getMarketPrice(goal, marketRates)
  const netSavedAmount = ledger.length
    ? ledger.reduce((sum, transaction) => sum + getTransactionSignedAmount(transaction), 0)
    : Math.max(0, goal.savedAmount)
  const currentQuantity = ledger.length
    ? ledger.reduce((sum, transaction) => sum + getTransactionSignedQuantity(transaction), 0)
    : Math.max(0, goal.savedAmount)
  const currentMarketPrice = marketPrice
  const currentRequiredAmount = mode === 'ASSET_FUNDING'
    ? (currentMarketPrice !== null
      ? Math.max(0, (goal.targetQuantity ?? goal.targetAmount) * currentMarketPrice)
      : Math.max(0, goal.targetAmount || goal.savedAmount || 0))
    : mode === 'ASSET_HOLDING'
      ? Math.max(0, goal.targetQuantity ?? goal.targetAmount)
      : effectiveTargetAmount
  const currentMarketValue = mode === 'ASSET_HOLDING' && currentMarketPrice !== null ? Math.max(0, currentQuantity * currentMarketPrice) : null
  const savedBasis = mode === 'ASSET_HOLDING' ? currentQuantity : netSavedAmount
  const remainingAmount = Math.max(0, (currentRequiredAmount || 0) - (mode === 'ASSET_HOLDING' ? currentQuantity : savedBasis))
  const progressPercent = (() => {
    if (mode === 'ASSET_HOLDING') {
      const targetQuantity = Math.max(0, goal.targetQuantity ?? goal.targetAmount)
      if (!targetQuantity) return 0
      return Math.min(100, Math.round((currentQuantity / targetQuantity) * 100))
    }

    if (!currentRequiredAmount) return 0
    return Math.min(100, Math.round((netSavedAmount / currentRequiredAmount) * 100))
  })()
  const daysRemaining = goal.targetDate ? Math.max(0, daysBetween(today || goal.startDate || goal.targetDate, goal.targetDate)) : null
  const monthlyNeeded = goal.targetDate ? Math.ceil(remainingAmount / Math.max(1, Math.ceil((daysRemaining ?? 0) / 30) || 1)) : remainingAmount
  const weeklyNeeded = goal.targetDate ? Math.ceil(remainingAmount / Math.max(1, Math.ceil((daysRemaining ?? 0) / 7) || 1)) : Math.ceil(remainingAmount / 4)
  const paceLevel = getPaceLevel(progressPercent, goal.targetDate, today || goal.startDate || goal.targetDate || '')
  const healthLevel: GoalHealthLevel = progressPercent >= 100 ? 'excellent' : progressPercent >= 80 ? 'good' : progressPercent >= 50 ? 'watch' : 'danger'

  return {
    mode,
    currentUnitLabel: mode === 'ASSET_HOLDING' ? 'واحد دارایی' : 'تومان',
    targetLabel: mode === 'ASSET_HOLDING' ? 'مقدار هدف' : 'هدف پایه',
    savedLabel: mode === 'ASSET_HOLDING' ? 'موجودی فعلی' : 'پس‌انداز خالص',
    currentMarketPrice,
    currentRequiredAmount,
    currentMarketValue,
    netSavedAmount,
    currentQuantity,
    totalCost: ledger.reduce((sum, transaction) => sum + Math.max(0, transaction.baseAmount), 0),
    profitLoss: currentMarketValue !== null ? currentMarketValue - ledger.reduce((sum, transaction) => sum + Math.max(0, transaction.baseAmount), 0) : 0,
    progressPercent,
    remainingAmount,
    paceLevel,
    healthLevel,
    daysRemaining,
    monthlyNeeded,
    weeklyNeeded,
    estimatedCompletionDate: estimateCompletionDate(today || goal.startDate || '', daysRemaining, paceLevel),
  }
}

export function formatGoalModeLabel(mode: GoalTrackingMode) {
  if (mode === 'ASSET_FUNDING') return 'تامین دارایی'
  if (mode === 'ASSET_HOLDING') return 'نگهداری دارایی'

  return 'پول ثابت'
}

export function formatGoalHealthLabel(level: GoalHealthLevel) {
  if (level === 'excellent') return 'عالی'
  if (level === 'good') return 'خوب'
  if (level === 'watch') return 'زیرنظر'

  return 'پرریسک'
}

export function calculateGoalScenario(goal: GoalLike, transactions: GoalTransactionLike[] = [], marketRates?: GoalMarketRates | null, today = ''): GoalTimelineScenario {
  const baseline = calculateGoalSnapshot(goal, transactions, marketRates, today)
  const currentSaved = baseline.mode === 'ASSET_HOLDING' ? baseline.currentQuantity : baseline.netSavedAmount
  const acceleratedSaved = currentSaved + Math.max(0, baseline.monthlyNeeded)
  const scenarioTransactions: GoalTransactionLike[] = []
  const acceleratedGoal = {
    ...goal,
    savedAmount: acceleratedSaved,
  }
  const pausedGoal = {
    ...goal,
    savedAmount: currentSaved,
  }

  return {
    baseline,
    accelerated: calculateGoalSnapshot(acceleratedGoal, scenarioTransactions, marketRates, today),
    paused: calculateGoalSnapshot(pausedGoal, scenarioTransactions, marketRates, today),
  }
}
import { addJalaliDays, parseJalaliInput, toGregorian } from './jalali'
