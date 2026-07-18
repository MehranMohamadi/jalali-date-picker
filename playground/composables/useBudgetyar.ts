import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'

import {
  Chart,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
  registerables,
} from 'chart.js'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { addJalaliDays, getJalaliMonthLength, parseJalaliInput, toGregorian, toJalali } from '../../src/utils/jalali'
import {
  buildCashflowTimeline,
  getCashflowRiskLevel,
  getPurchaseDecision,
  getRecurringNextDueDate as getPlanningRecurringNextDueDate,
  type CashflowForecastDay,
  type CashflowRiskLevel,
  type PurchaseDecisionResult,
  type RecurringFrequency,
} from '../../src/utils/budgetyarPlanning'
import {
  calculateDebtPayoffPlan as calculateAdvancedDebtPayoffPlan,
  calculateFinancialHealthScore,
  calculateIrregularIncomeBudget,
  matchCategorizationRule,
  type CategorizationMatchType,
  type DebtPayoffPlan,
  type DebtPayoffStrategy,
  type FinancialHealthLevel,
  type IncomeBudgetingMode,
} from '../../src/utils/budgetyarAdvancedFinance'
import {
  calculateGoalScenario,
  calculateGoalSnapshot,
  formatGoalHealthLabel,
  formatGoalModeLabel,
  type GoalCommitmentMode,
  type GoalMarketRates,
  type GoalTargetValuePolicy,
  type GoalTrackingMode,
} from '../../src/utils/budgetyarGoals'

Chart.register(...registerables)
const BankNotifications = registerPlugin<BankNotificationsPlugin>('BankNotifications')

export type TransactionType = 'income' | 'expense'
export type PaymentMethod = 'cash' | 'credit'
export type CashFlowMode = 'regular' | 'afterCredit' | 'afterCommitments'
export type ThemeMode = 'dark' | 'light' | 'forest'
export type GoalPriority = 'low' | 'medium' | 'high'
export type GoalUnit = 'irr' | 'goldGram' | 'silverGram' | 'usd'
export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived'
export type RecurringItemType = 'income' | 'expense'
export type CashflowForecastPeriod = 'untilEndOfMonth' | 'next30Days' | 'next90Days'
export type BudgetyarDebtType = 'loan' | 'credit' | 'personal' | 'installment' | 'other'

export type CategoryKey = string
export type ExportFormat = 'PDF' | 'Excel' | 'CSV' | 'JSON'

export interface Category {
  key: CategoryKey
  label: string
  icon: string
  color: string
}

export interface Transaction {
  id: number
  type: TransactionType
  title: string
  amount: number
  date: string
  category?: CategoryKey
  description?: string
  paymentMethod?: PaymentMethod
  isEssential?: boolean
  isLoan?: boolean
  loanPerson?: string
  sourceType?: 'manual' | 'recurring' | 'installment' | 'bank-notification'
  sourceId?: string
  sourceDate?: string
  autoCategorized?: boolean
  categorizationRuleId?: string
  merchantName?: string
}

export interface BudgetGoal {
  category: CategoryKey
  budget: number
}

export interface InstallmentPlan {
  id: number
  title: string
  amount: number
  category: CategoryKey
  startDate: string
  dueDay: number
  totalCount: number
  paidCount: number
  description?: string
  paymentMethod: PaymentMethod
}

export interface BudgetyarGoal {
  id: string
  title: string
  targetAmount: number
  savedAmount: number
  unit?: GoalUnit
  trackingMode?: GoalTrackingMode
  baseCurrency?: 'irr' | 'usd'
  targetQuantity?: number
  assetCode?: string
  targetValuePolicy?: GoalTargetValuePolicy
  inflationRate?: number
  priceSource?: string
  contributionFrequency?: 'none' | 'weekly' | 'monthly' | 'salary-day' | 'custom'
  plannedContribution?: number
  reminderPolicy?: 'none' | 'before-due' | 'every-week' | 'manual'
  commitmentMode?: GoalCommitmentMode
  coolingOffPeriod?: number
  targetDate?: string
  categoryId?: string
  priority: GoalPriority
  icon?: string
  color?: string
  note?: string
  status?: GoalStatus
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface BudgetyarGoalTransaction {
  id: string
  goalId: string
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'ASSET_PURCHASE' | 'ASSET_SALE'
  baseAmount: number
  quantity: number
  unitPrice: number
  fee: number
  currency: 'irr' | 'usd'
  assetCode?: string
  occurredAt: string
  note?: string
  sourceAccountId?: string
  relatedTransactionId?: string
  idempotencyKey: string
  createdAt: string
}

export interface BudgetyarRecurringItem {
  id: string
  title: string
  type: RecurringItemType
  amount: number
  categoryId?: string
  frequency: RecurringFrequency
  startDate: string
  endDate?: string
  dueDay?: number
  paymentMethod?: PaymentMethod
  isSubscription: boolean
  isActive: boolean
  reminderDaysBefore: number
  lastAppliedDate?: string
  skippedDates?: string[]
  note?: string
  createdAt: string
  updatedAt: string
}

export interface BudgetyarDebt {
  id: string
  title: string
  type: BudgetyarDebtType
  principalAmount: number
  remainingAmount: number
  interestRateAnnual?: number
  minimumMonthlyPayment: number
  extraMonthlyPayment?: number
  dueDay?: number
  startDate?: string
  targetPayoffDate?: string
  linkedInstallmentId?: string
  creditorName?: string
  priority: GoalPriority
  isActive: boolean
  note?: string
  createdAt: string
  updatedAt: string
}

export interface BudgetyarCategorizationRule {
  id: string
  title: string
  isActive: boolean
  matchType: CategorizationMatchType
  pattern?: string
  minAmount?: number
  maxAmount?: number
  merchantName?: string
  categoryId: string
  transactionType?: TransactionType
  paymentMethod?: PaymentMethod
  priority: number
  applyToExisting: boolean
  createdAt: string
  updatedAt: string
}

export interface BudgetyarIncomeSettings {
  mode: IncomeBudgetingMode
  fixedMonthlyIncome?: number
  manualBudgetBase?: number
  historyMonths: 3 | 6 | 12
  safetyBufferPercent: number
  badMonthReservePercent: number
  essentialPercent: number
  savingPercent: number
  flexiblePercent: number
  updatedAt: string
}

interface BankAppOption {
  packageName: string
  label: string
}

interface BankNotificationStatus {
  isAndroid: boolean
  isEnabled: boolean
  selectedPackage: string
  selectedAppLabel: string
}

interface BankNotificationSuggestion {
  id: string
  sourcePackage: string
  sourceApp: string
  title: string
  amount: number
  category: CategoryKey
  postTime: number
  rawText: string
}

interface BankNotificationsPlugin {
  getStatus: () => Promise<BankNotificationStatus>
  openNotificationSettings: () => Promise<void>
  getSelectableApps: () => Promise<{ apps: BankAppOption[] }>
  setSelectedPackage: (options: { packageName: string }) => Promise<void>
  getSuggestions: () => Promise<{ suggestions: BankNotificationSuggestion[] }>
  markSuggestion: (options: { id: string; action: 'accepted' | 'dismissed' }) => Promise<void>
}

interface ToastMessage {
  id: number
  text: string
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface FileShareNavigator extends Navigator {
  canShare?: (data: { files?: File[] }) => boolean
  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>
}

const defaultCategories: Category[] = [
  { key: 'food', label: 'غذا', icon: '🍔', color: '#22d3ee' },
  { key: 'transport', label: 'حمل و نقل', icon: '🚗', color: '#60a5fa' },
  { key: 'rent', label: 'اجاره', icon: '🏠', color: '#a78bfa' },
  { key: 'shopping', label: 'خرید', icon: '🛒', color: '#f472b6' },
  { key: 'bills', label: 'قبوض', icon: '💡', color: '#facc15' },
  { key: 'fun', label: 'سرگرمی', icon: '🎮', color: '#34d399' },
  { key: 'sport', label: 'ورزش', icon: '🏋️', color: '#fb7185' },
  { key: 'clothes', label: 'پوشاک', icon: '👕', color: '#38bdf8' },
  { key: 'health', label: 'درمان', icon: '💊', color: '#4ade80' },
  { key: 'education', label: 'آموزش', icon: '📚', color: '#818cf8' },
  { key: 'travel', label: 'سفر', icon: '✈️', color: '#2dd4bf' },
  { key: 'pets', label: 'حیوانات', icon: '🐶', color: '#fb923c' },
  { key: 'gift', label: 'هدیه', icon: '🎁', color: '#c084fc' },
  { key: 'other', label: 'سایر', icon: '📦', color: '#94a3b8' },
]

const persianOnes = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const persianTeens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const persianTens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const persianHundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const persianScales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون', 'کوادریلیون']

const categories = ref<Category[]>([...defaultCategories])

const transactions = ref<Transaction[]>([

])

const budgets = ref<BudgetGoal[]>([
  { category: 'food', budget: 8000000 },
  { category: 'transport', budget: 3000000 },
  { category: 'rent', budget: 24000000 },
  { category: 'shopping', budget: 5000000 },
  { category: 'bills', budget: 1200000 },
  { category: 'fun', budget: 2500000 },
  { category: 'sport', budget: 1800000 },
  { category: 'clothes', budget: 3000000 },
  { category: 'health', budget: 1500000 },
  { category: 'education', budget: 3500000 },
  { category: 'travel', budget: 6000000 },
  { category: 'pets', budget: 1000000 },
  { category: 'gift', budget: 2000000 },
  { category: 'other', budget: 1500000 },
])

const activeSection = ref('داشبورد')
const isMobileMenuOpen = ref(false)
const isMobileViewport = ref(false)
const STORAGE_KEY = 'budgetyar-transactions-v1'
const CATEGORIES_STORAGE_KEY = 'budgetyar-categories-v1'
const BUDGETS_STORAGE_KEY = 'budgetyar-budgets-v1'
const CREDIT_STORAGE_KEY = 'budgetyar-credit-limit-v1'
const INSTALLMENTS_STORAGE_KEY = 'budgetyar-installments-v1'
const THEME_STORAGE_KEY = 'budgetyar-theme-v1'
const GOALS_STORAGE_KEY = 'budgetyar-goals-v1'
const GOAL_TRANSACTIONS_STORAGE_KEY = 'budgetyar-goal-transactions-v1'
const RECURRING_ITEMS_STORAGE_KEY = 'budgetyar-recurring-items-v1'
const DEBTS_STORAGE_KEY = 'budgetyar-debts-v1'
const CATEGORIZATION_RULES_STORAGE_KEY = 'budgetyar-categorization-rules-v1'
const DELETED_DEFAULT_CATEGORIZATION_RULES_STORAGE_KEY = 'budgetyar-deleted-default-categorization-rules-v1'
const INCOME_SETTINGS_STORAGE_KEY = 'budgetyar-income-settings-v1'
const navItems = ['داشبورد', 'درآمدها', 'هزینه‌ها', 'بودجه‌ها', 'قسط‌ها', 'گزارش‌ها', 'آمار', 'اعلان‌ها', 'تنظیمات']
const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const currentJalaliDate = getCurrentJalaliDate()
const todayKey = formatJalaliInputDate(currentJalaliDate)
const currentMonthPrefix = getJalaliMonthPrefix(currentJalaliDate)
const currentMonthLength = getJalaliMonthLength(currentJalaliDate.year, currentJalaliDate.month)
const currentMonthStartKey = formatJalaliInputDate({ ...currentJalaliDate, day: 1 })
const currentMonthEndKey = formatJalaliInputDate({ ...currentJalaliDate, day: currentMonthLength })
const currentWeekRange = getCurrentWeekRange(currentJalaliDate)
const currentWeekStartKey = formatJalaliInputDate(currentWeekRange.start)
const currentWeekEndKey = formatJalaliInputDate(currentWeekRange.end)
const currentMonthYear = `${months[currentJalaliDate.month - 1]} ${toPersianNumber(currentJalaliDate.year)}`
const years = [currentJalaliDate.year - 1, currentJalaliDate.year, currentJalaliDate.year + 1].map(toPersianNumber)
const defaultCategorizationRuleTemplates = [
  { id: 'snap', title: 'اسنپ', pattern: 'اسنپ', preferredCategory: 'حمل و نقل', fallbackCategory: 'transport' },
  { id: 'tapsi', title: 'تپسی', pattern: 'تپسی', preferredCategory: 'حمل و نقل', fallbackCategory: 'transport' },
  { id: 'fuel', title: 'بنزین و سوخت', pattern: 'پمپ بنزین', preferredCategory: 'سوخت و بنزین', fallbackCategory: 'transport' },
  { id: 'parking', title: 'پارکینگ', pattern: 'پارکینگ', preferredCategory: 'پارکینگ و عوارض', fallbackCategory: 'transport' },
  { id: 'car-repair', title: 'تعمیر خودرو', pattern: 'تعمیرگاه', preferredCategory: 'تعمیر و نگهداری خودرو', fallbackCategory: 'transport' },
  { id: 'digikala', title: 'دیجی‌کالا', pattern: 'دیجی‌کالا', preferredCategory: 'خرید', fallbackCategory: 'shopping' },
  { id: 'snapfood', title: 'اسنپ‌فود', pattern: 'اسنپ‌فود', preferredCategory: 'رستوران و غذای بیرون', fallbackCategory: 'food' },
  { id: 'restaurant', title: 'رستوران', pattern: 'رستوران', preferredCategory: 'رستوران و غذای بیرون', fallbackCategory: 'food' },
  { id: 'cafe', title: 'کافه', pattern: 'کافه', preferredCategory: 'کافه و قهوه', fallbackCategory: 'food' },
  { id: 'coffee', title: 'قهوه', pattern: 'قهوه', preferredCategory: 'کافه و قهوه', fallbackCategory: 'food' },
  { id: 'tea', title: 'چای', pattern: 'چای', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'water', title: 'آب معدنی', pattern: 'آب', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'soda', title: 'نوشابه', pattern: 'نوشابه', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'juice', title: 'آبمیوه و نوشیدنی', pattern: 'آبمیوه', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'milk', title: 'شیر و لبنیات', pattern: 'شیر', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'bread', title: 'نان', pattern: 'نان', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'rice', title: 'برنج و حبوبات', pattern: 'برنج', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'meat', title: 'گوشت و مرغ', pattern: 'گوشت', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'fruit', title: 'میوه و سبزی', pattern: 'میوه', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'fastfood', title: 'فست‌فود', pattern: 'فست', preferredCategory: 'رستوران و غذای بیرون', fallbackCategory: 'food' },
  { id: 'pizza', title: 'پیتزا', pattern: 'پیتزا', preferredCategory: 'رستوران و غذای بیرون', fallbackCategory: 'food' },
  { id: 'kebab', title: 'کباب', pattern: 'کباب', preferredCategory: 'رستوران و غذای بیرون', fallbackCategory: 'food' },
  { id: 'sandwich', title: 'ساندویچ', pattern: 'ساندویچ', preferredCategory: 'رستوران و غذای بیرون', fallbackCategory: 'food' },
  { id: 'sweet', title: 'شیرینی و کیک', pattern: 'شیرینی', preferredCategory: 'رستوران و غذای بیرون', fallbackCategory: 'food' },
  { id: 'supermarket', title: 'سوپرمارکت', pattern: 'سوپر', preferredCategory: 'خواربار و سوپرمارکت', fallbackCategory: 'food' },
  { id: 'internet', title: 'اینترنت', pattern: 'اینترنت', preferredCategory: 'اینترنت و تلفن', fallbackCategory: 'bills' },
  { id: 'wifi', title: 'وای‌فای و مودم', pattern: 'وای‌فای', preferredCategory: 'اینترنت و تلفن', fallbackCategory: 'bills' },
  { id: 'modem', title: 'مودم', pattern: 'مودم', preferredCategory: 'تکنولوژی', fallbackCategory: 'other' },
  { id: 'charge', title: 'شارژ سیم‌کارت', pattern: 'شارژ', preferredCategory: 'اینترنت و تلفن', fallbackCategory: 'bills' },
  { id: 'mci', title: 'همراه اول', pattern: 'همراه اول', preferredCategory: 'اینترنت و تلفن', fallbackCategory: 'bills' },
  { id: 'irancell', title: 'ایرانسل', pattern: 'ایرانسل', preferredCategory: 'اینترنت و تلفن', fallbackCategory: 'bills' },
  { id: 'rightel', title: 'رایتل', pattern: 'رایتل', preferredCategory: 'اینترنت و تلفن', fallbackCategory: 'bills' },
  { id: 'utilities', title: 'قبض خدماتی', pattern: 'قبض', preferredCategory: 'آب، برق و گاز', fallbackCategory: 'bills' },
  { id: 'electricity', title: 'برق', pattern: 'برق', preferredCategory: 'آب، برق و گاز', fallbackCategory: 'bills' },
  { id: 'gas', title: 'گاز', pattern: 'گاز', preferredCategory: 'آب، برق و گاز', fallbackCategory: 'bills' },
  { id: 'water-bill', title: 'آب و فاضلاب', pattern: 'فاضلاب', preferredCategory: 'آب، برق و گاز', fallbackCategory: 'bills' },
  { id: 'rent', title: 'اجاره خانه', pattern: 'اجاره', preferredCategory: 'اجاره', fallbackCategory: 'rent' },
  { id: 'home-repair', title: 'تعمیرات خانه', pattern: 'تعمیرات', preferredCategory: 'خانه و تعمیرات', fallbackCategory: 'rent' },
  { id: 'pharmacy', title: 'داروخانه', pattern: 'داروخانه', preferredCategory: 'دارو و دندان‌پزشکی', fallbackCategory: 'health' },
  { id: 'doctor', title: 'پزشک', pattern: 'پزشک', preferredCategory: 'درمان', fallbackCategory: 'health' },
  { id: 'tuition', title: 'شهریه', pattern: 'شهریه', preferredCategory: 'آموزش', fallbackCategory: 'education' },
  { id: 'book', title: 'کتاب', pattern: 'کتاب', preferredCategory: 'کتاب و آموزش آنلاین', fallbackCategory: 'education' },
  { id: 'clothes', title: 'پوشاک', pattern: 'پوشاک', preferredCategory: 'پوشاک', fallbackCategory: 'clothes' },
  { id: 'gym', title: 'باشگاه', pattern: 'باشگاه', preferredCategory: 'ورزش', fallbackCategory: 'sport' },
  { id: 'cinema', title: 'سینما', pattern: 'سینما', preferredCategory: 'تفریح و سرگرمی دیجیتال', fallbackCategory: 'fun' },
  { id: 'petshop', title: 'پت‌شاپ', pattern: 'پت‌شاپ', preferredCategory: 'حیوانات', fallbackCategory: 'pets' },
  { id: 'insurance', title: 'بیمه', pattern: 'بیمه', preferredCategory: 'بیمه', fallbackCategory: 'other' },
  { id: 'bank-fee', title: 'کارمزد بانکی', pattern: 'کارمزد', preferredCategory: 'کارمزد بانکی', fallbackCategory: 'other' },
  { id: 'gift', title: 'هدیه', pattern: 'هدیه', preferredCategory: 'هدیه', fallbackCategory: 'gift' },
  { id: 'subscription', title: 'اشتراک', pattern: 'اشتراک', preferredCategory: 'اشتراک‌ها', fallbackCategory: 'other' },
  { id: 'tax', title: 'مالیات', pattern: 'مالیات', preferredCategory: 'مالیات و عوارض', fallbackCategory: 'other' },
] as const
const defaultIncomeSettings: BudgetyarIncomeSettings = {
  mode: 'average',
  historyMonths: 3,
  safetyBufferPercent: 15,
  badMonthReservePercent: 10,
  essentialPercent: 60,
  savingPercent: 20,
  flexiblePercent: 20,
  updatedAt: todayKey,
}
const query = ref('')
const selectedMonth = ref(months[currentJalaliDate.month - 1])
const selectedYear = ref(toPersianNumber(currentJalaliDate.year))
const selectedCategory = ref('همه')
const selectedType = ref('همه')
const dateRange = reactive({ start: '', end: '' })
const pickerDateRange = computed({
  get: () => ({
    start: jalaliInputToIso(dateRange.start),
    end: jalaliInputToIso(dateRange.end),
  }),
  set: (value: { start: string | null; end: string | null }) => {
    dateRange.start = value.start ? isoToJalaliInput(value.start) : ''
    dateRange.end = value.end ? isoToJalaliInput(value.end) : ''
  },
})
const isModalOpen = ref(false)
const formType = ref<TransactionType>('expense')
const toasts = ref<ToastMessage[]>([])
const editingId = ref<number | null>(null)
const expenseShareCanvas = ref<HTMLCanvasElement | null>(null)
const categoryBarCanvas = ref<HTMLCanvasElement | null>(null)
const trendLineCanvas = ref<HTMLCanvasElement | null>(null)
const statsExpenseMixCanvas = ref<HTMLCanvasElement | null>(null)
const statsBudgetUsageCanvas = ref<HTMLCanvasElement | null>(null)
const statsDailyExpenseCanvas = ref<HTMLCanvasElement | null>(null)
const statsWeeklyFlowCanvas = ref<HTMLCanvasElement | null>(null)
const statsCashFlowCanvas = ref<HTMLCanvasElement | null>(null)
const statsEssentialCanvas = ref<HTMLCanvasElement | null>(null)
const statsPaymentMethodCanvas = ref<HTMLCanvasElement | null>(null)
const statsMonthlyTrendCanvas = ref<HTMLCanvasElement | null>(null)
const statsCommitmentCanvas = ref<HTMLCanvasElement | null>(null)
const expenseShareChart = shallowRef<Chart<'doughnut'> | null>(null)
const categoryBarChart = shallowRef<Chart<'bar'> | null>(null)
const trendLineChart = shallowRef<Chart<'line'> | null>(null)
const statsExpenseMixChart = shallowRef<Chart<'polarArea'> | null>(null)
const statsBudgetUsageChart = shallowRef<Chart<'bar'> | null>(null)
const statsDailyExpenseChart = shallowRef<Chart<'line'> | null>(null)
const statsWeeklyFlowChart = shallowRef<Chart<'bar'> | null>(null)
const statsCashFlowChart = shallowRef<Chart<'bar'> | null>(null)
const statsEssentialChart = shallowRef<Chart<'doughnut'> | null>(null)
const statsPaymentMethodChart = shallowRef<Chart<'bar'> | null>(null)
const statsMonthlyTrendChart = shallowRef<Chart<'line'> | null>(null)
const statsCommitmentChart = shallowRef<Chart<'doughnut'> | null>(null)
let chartSyncFrame: number | null = null
let mobileViewportQuery: MediaQueryList | null = null
let mobileViewportListener: ((event: MediaQueryListEvent) => void) | null = null

const form = reactive({
  amount: 0,
  title: '',
  date: todayKey,
  category: 'food' as CategoryKey,
  description: '',
  paymentMethod: 'cash' as PaymentMethod,
  isEssential: true,
  isLoan: false,
  loanPerson: '',
})
const formAmountInWords = computed(() => formatMoneyWords(form.amount))
const formDatePickerValue = computed({
  get: () => jalaliInputToIso(form.date),
  set: (value: string | null) => {
    form.date = value ? isoToJalaliInput(value) : ''
  },
})

const categoryForm = reactive({
  label: '',
  icon: '✨',
  budget: 1000000,
})
const installments = ref<InstallmentPlan[]>([])
const goals = ref<BudgetyarGoal[]>([])
const goalTransactions = ref<BudgetyarGoalTransaction[]>([])
const marketRates = ref<GoalMarketRates | null>(null)
const marketRatesLoading = ref(false)
const marketRatesError = ref('')
const recurringItems = ref<BudgetyarRecurringItem[]>([])
const debts = ref<BudgetyarDebt[]>([])
const categorizationRules = ref<BudgetyarCategorizationRule[]>([])
const incomeSettings = ref<BudgetyarIncomeSettings>({ ...defaultIncomeSettings })
const editingInstallmentId = ref<number | null>(null)
const editingGoalId = ref<string | null>(null)
const editingRecurringItemId = ref<string | null>(null)
const editingDebtId = ref<string | null>(null)
const editingCategorizationRuleId = ref<string | null>(null)
const cashflowForecastPeriod = ref<CashflowForecastPeriod>('untilEndOfMonth')
const selectedDebtStrategy = ref<DebtPayoffStrategy>('snowball')
const installmentForm = reactive({
  title: '',
  amount: 0,
  category: 'other' as CategoryKey,
  startDate: todayKey,
  dueDay: currentJalaliDate.day,
  totalCount: 12,
  description: '',
  paymentMethod: 'cash' as PaymentMethod,
})
const goalForm = reactive({
  title: '',
  targetAmount: 0,
  savedAmount: 0,
  unit: 'irr' as GoalUnit,
  trackingMode: 'FIXED_MONEY' as GoalTrackingMode,
  baseCurrency: 'irr' as 'irr' | 'usd',
  targetQuantity: 0,
  assetCode: '',
  targetValuePolicy: 'NOMINAL' as GoalTargetValuePolicy,
  inflationRate: 0,
  priceSource: '',
  contributionFrequency: 'monthly' as 'none' | 'weekly' | 'monthly' | 'salary-day' | 'custom',
  plannedContribution: 0,
  reminderPolicy: 'before-due' as 'none' | 'before-due' | 'every-week' | 'manual',
  commitmentMode: 'NONE' as GoalCommitmentMode,
  coolingOffPeriod: 0,
  targetDate: '',
  categoryId: '',
  priority: 'medium' as GoalPriority,
  icon: '🎯',
  color: '#22d3ee',
  note: '',
})
const recurringForm = reactive({
  title: '',
  type: 'expense' as RecurringItemType,
  amount: 0,
  categoryId: 'other' as CategoryKey,
  frequency: 'monthly' as RecurringFrequency,
  startDate: todayKey,
  endDate: '',
  dueDay: currentJalaliDate.day,
  paymentMethod: 'cash' as PaymentMethod,
  isSubscription: false,
  isActive: true,
  reminderDaysBefore: 3,
  note: '',
})
const purchaseForm = reactive({
  amount: 0,
  categoryId: 'other' as CategoryKey,
  date: todayKey,
  isEssential: false,
  paymentMethod: 'cash' as PaymentMethod,
  note: '',
})
const debtForm = reactive({
  title: '',
  type: 'loan' as BudgetyarDebtType,
  principalAmount: 0,
  remainingAmount: 0,
  interestRateAnnual: 0,
  minimumMonthlyPayment: 0,
  extraMonthlyPayment: 0,
  dueDay: currentJalaliDate.day,
  startDate: todayKey,
  targetPayoffDate: '',
  linkedInstallmentId: '',
  creditorName: '',
  priority: 'medium' as GoalPriority,
  isActive: true,
  note: '',
})
const categorizationRuleForm = reactive({
  title: '',
  isActive: true,
  matchType: 'contains' as CategorizationMatchType,
  pattern: '',
  minAmount: 0,
  maxAmount: 0,
  merchantName: '',
  categoryId: 'other' as CategoryKey,
  transactionType: '' as '' | TransactionType,
  paymentMethod: '' as '' | PaymentMethod,
  priority: 10,
  applyToExisting: false,
})
const installmentAmountInWords = computed(() => formatMoneyWords(installmentForm.amount))
const goalTargetAmountInWords = computed(() => formatMoneyWords(goalForm.targetAmount))
const goalSavedAmountInWords = computed(() => formatMoneyWords(goalForm.savedAmount))
const recurringAmountInWords = computed(() => formatMoneyWords(recurringForm.amount))
const purchaseAmountInWords = computed(() => formatMoneyWords(purchaseForm.amount))
const debtPrincipalAmountInWords = computed(() => formatMoneyWords(debtForm.principalAmount))
const debtRemainingAmountInWords = computed(() => formatMoneyWords(debtForm.remainingAmount))
const debtMinimumPaymentInWords = computed(() => formatMoneyWords(debtForm.minimumMonthlyPayment))
const ruleMinAmountInWords = computed(() => formatMoneyWords(categorizationRuleForm.minAmount))
const ruleMaxAmountInWords = computed(() => formatMoneyWords(categorizationRuleForm.maxAmount))
const installmentStartDatePickerValue = computed({
  get: () => jalaliInputToIso(installmentForm.startDate),
  set: (value: string | null) => {
    installmentForm.startDate = value ? isoToJalaliInput(value) : ''
  },
})
const goalTargetDatePickerValue = computed({
  get: () => (goalForm.targetDate ? jalaliInputToIso(goalForm.targetDate) : null),
  set: (value: string | null) => {
    goalForm.targetDate = value ? isoToJalaliInput(value) : ''
  },
})
const recurringStartDatePickerValue = computed({
  get: () => jalaliInputToIso(recurringForm.startDate),
  set: (value: string | null) => {
    recurringForm.startDate = value ? isoToJalaliInput(value) : ''
  },
})
const recurringEndDatePickerValue = computed({
  get: () => (recurringForm.endDate ? jalaliInputToIso(recurringForm.endDate) : null),
  set: (value: string | null) => {
    recurringForm.endDate = value ? isoToJalaliInput(value) : ''
  },
})
const purchaseDatePickerValue = computed({
  get: () => jalaliInputToIso(purchaseForm.date),
  set: (value: string | null) => {
    purchaseForm.date = value ? isoToJalaliInput(value) : todayKey
  },
})
const debtStartDatePickerValue = computed({
  get: () => jalaliInputToIso(debtForm.startDate),
  set: (value: string | null) => {
    debtForm.startDate = value ? isoToJalaliInput(value) : todayKey
  },
})
const debtTargetPayoffDatePickerValue = computed({
  get: () => (debtForm.targetPayoffDate ? jalaliInputToIso(debtForm.targetPayoffDate) : null),
  set: (value: string | null) => {
    debtForm.targetPayoffDate = value ? isoToJalaliInput(value) : ''
  },
})
const installPrompt = ref<InstallPromptEvent | null>(null)
const isStandalone = ref(false)
const isAndroidNative = ref(false)
const isNotificationsLoading = ref(false)
const bankApps = ref<BankAppOption[]>([])
const bankSuggestions = ref<BankNotificationSuggestion[]>([])
const selectedBankPackage = ref('')
const creditLimit = ref(0)
const cashFlowMode = ref<CashFlowMode>('regular')
const themeMode = ref<ThemeMode>('dark')
const bankNotificationStatus = reactive<BankNotificationStatus>({
  isAndroid: false,
  isEnabled: false,
  selectedPackage: '',
  selectedAppLabel: '',
})
const today = formatDisplayJalaliDate(currentJalaliDate)

const previousMonthPrefix = getPreviousMonthPrefix(currentJalaliDate)
const currentMonthTransactions = computed(() => transactions.value.filter((item) => normalizeJalaliDate(item.date).startsWith(currentMonthPrefix)))
const previousMonthTransactions = computed(() => transactions.value.filter((item) => normalizeJalaliDate(item.date).startsWith(previousMonthPrefix)))
const currentWeekTransactions = computed(() =>
  transactions.value.filter((item) => {
    const date = normalizeJalaliDate(item.date)
    return date >= currentWeekStartKey && date <= currentWeekEndKey
  }),
)
const expenseTransactions = computed(() => currentMonthTransactions.value.filter((item) => item.type === 'expense'))
const incomeTransactions = computed(() => currentMonthTransactions.value.filter((item) => item.type === 'income'))
const weeklyExpenseTransactions = computed(() => currentWeekTransactions.value.filter((item) => item.type === 'expense'))
const weeklyIncomeTransactions = computed(() => currentWeekTransactions.value.filter((item) => item.type === 'income'))
const previousExpense = computed(() => previousMonthTransactions.value.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0))
const previousIncome = computed(() => previousMonthTransactions.value.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0))
const totalIncome = computed(() => incomeTransactions.value.reduce((sum, item) => sum + item.amount, 0))
const totalExpense = computed(() => expenseTransactions.value.reduce((sum, item) => sum + item.amount, 0))
const creditExpense = computed(() => expenseTransactions.value.filter((item) => item.paymentMethod === 'credit').reduce((sum, item) => sum + item.amount, 0))
const creditRemaining = computed(() => Math.max(creditLimit.value - creditExpense.value, 0))
const cashExpense = computed(() => expenseTransactions.value.filter((item) => item.paymentMethod !== 'credit').reduce((sum, item) => sum + item.amount, 0))
const cashBeforeCreditPayment = computed(() => totalIncome.value - cashExpense.value)
const balanceAfterCreditPayment = computed(() => cashBeforeCreditPayment.value - creditExpense.value)
const loanedExpense = computed(() => expenseTransactions.value.filter((item) => item.isLoan).reduce((sum, item) => sum + item.amount, 0))
const essentialExpense = computed(() => expenseTransactions.value.filter((item) => item.isEssential !== false).reduce((sum, item) => sum + item.amount, 0))
const nonEssentialExpense = computed(() => expenseTransactions.value.filter((item) => item.isEssential === false).reduce((sum, item) => sum + item.amount, 0))
const weeklyIncome = computed(() => weeklyIncomeTransactions.value.reduce((sum, item) => sum + item.amount, 0))
const weeklyExpense = computed(() => weeklyExpenseTransactions.value.reduce((sum, item) => sum + item.amount, 0))
const weeklyCreditExpense = computed(() => weeklyExpenseTransactions.value.filter((item) => item.paymentMethod === 'credit').reduce((sum, item) => sum + item.amount, 0))
const weeklyBalance = computed(() => weeklyIncome.value - weeklyExpense.value)
const totalBudget = computed(() => budgets.value.reduce((sum, item) => sum + item.budget, 0))
const currentMonthWeekCount = computed(() => Math.ceil(currentMonthLength / 7))
const weeklyBudgetAllowance = computed(() => Math.round(totalBudget.value / Math.max(currentMonthWeekCount.value, 1)))
const balance = computed(() => totalIncome.value - totalExpense.value)
const budgetUsage = computed(() => Math.round((totalExpense.value / Math.max(totalBudget.value, 1)) * 100))
const savingsPercent = computed(() => Math.max(0, Math.round((balance.value / Math.max(totalIncome.value, 1)) * 100)))

const categoryTotals = computed(() =>
  categories.value.map((category) => ({
    ...category,
    spent: expenseTransactions.value
      .filter((item) => item.category === category.key)
      .reduce((sum, item) => sum + item.amount, 0),
    budget: budgets.value.find((goal) => goal.category === category.key)?.budget ?? 0,
  })),
)

const weeklyCategoryBudgets = computed(() =>
  categoryTotals.value
    .filter((item) => item.budget > 0)
    .map((item) => ({
      ...item,
      weeklyBudget: Math.round(item.budget / Math.max(currentMonthWeekCount.value, 1)),
    })),
)

const weeklyBudgetAnalysis = computed(() =>
  weeklyCategoryBudgets.value
    .map((item) => {
      const spentThisWeek = weeklyExpenseTransactions.value
        .filter((expense) => expense.category === item.key)
        .reduce((sum, expense) => sum + expense.amount, 0)
      const ratio = Math.round((spentThisWeek / Math.max(item.weeklyBudget, 1)) * 100)

      return {
        ...item,
        spentThisWeek,
        ratio,
        overAmount: Math.max(spentThisWeek - item.weeklyBudget, 0),
      }
    })
    .filter((item) => item.spentThisWeek > 0 && item.ratio >= 80)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3),
)

const sortedCategoryTotals = computed(() => [...categoryTotals.value].sort((a, b) => b.spent - a.spent))
const visibleCategoryTotals = computed(() => sortedCategoryTotals.value.filter((item) => item.spent > 0).slice(0, 10))
const maxCategory = computed(() => sortedCategoryTotals.value.find((item) => item.spent > 0))
const safeMaxCategory = computed(() => maxCategory.value ?? getCategory('other'))
const highestExpense = computed<Transaction>(() => [...expenseTransactions.value].sort((a, b) => b.amount - a.amount)[0] ?? {
  id: 0,
  type: 'expense',
  title: 'بدون هزینه',
  amount: 0,
  date: currentMonthStartKey,
  category: 'other',
})
const lowestExpense = computed<Transaction>(() => [...expenseTransactions.value].sort((a, b) => a.amount - b.amount)[0] ?? {
  id: 0,
  type: 'expense',
  title: 'بدون هزینه',
  amount: 0,
  date: currentMonthStartKey,
  category: 'other',
})
const todayExpense = computed(() => expenseTransactions.value.filter((item) => normalizeJalaliDate(item.date) === todayKey).reduce((sum, item) => sum + item.amount, 0))
const todayIncome = computed(() => incomeTransactions.value.filter((item) => normalizeJalaliDate(item.date) === todayKey).reduce((sum, item) => sum + item.amount, 0))
const averageDailyExpense = computed(() => Math.round(totalExpense.value / Math.max(currentJalaliDate.day, 1)))
const latestExpenses = computed(() =>
  [...transactions.value]
    .filter((item) => item.type === 'expense')
    .sort((a, b) => normalizeJalaliDate(b.date).localeCompare(normalizeJalaliDate(a.date)) || b.id - a.id)
    .slice(0, 3),
)
const latestLoans = computed(() =>
  [...expenseTransactions.value]
    .filter((item) => item.isLoan)
    .sort((a, b) => normalizeJalaliDate(b.date).localeCompare(normalizeJalaliDate(a.date)) || b.id - a.id)
    .slice(0, 3),
)
const installmentSummaries = computed(() =>
  installments.value
    .map((plan) => {
      const remainingCount = Math.max(plan.totalCount - plan.paidCount, 0)
      const nextDueDate = remainingCount ? getInstallmentDueDate(plan, plan.paidCount) : ''
      const status = getInstallmentStatus(plan)

      return {
        ...plan,
        remainingCount,
        nextDueDate,
        status,
        statusLabel: getInstallmentStatusLabel(status),
      }
    })
    .sort((a, b) => {
      if (!a.nextDueDate) return 1
      if (!b.nextDueDate) return -1
      return a.nextDueDate.localeCompare(b.nextDueDate)
    }),
)
const activeInstallmentSummaries = computed(() => installmentSummaries.value.filter((item) => item.status !== 'completed'))
const overdueInstallments = computed(() => activeInstallmentSummaries.value.filter((item) => item.status === 'overdue'))
const upcomingInstallments = computed(() => activeInstallmentSummaries.value.filter((item) => item.status === 'upcoming').slice(0, 3))
const dueInstallmentsThisMonth = computed(() =>
  activeInstallmentSummaries.value.filter((item) => item.nextDueDate >= currentMonthStartKey && item.nextDueDate <= currentMonthEndKey),
)
const monthlyInstallmentDue = computed(() => dueInstallmentsThisMonth.value.reduce((sum, item) => sum + item.amount, 0))
const commitmentInstallmentDue = computed(() =>
  activeInstallmentSummaries.value
    .filter((item) => item.nextDueDate <= currentMonthEndKey)
    .reduce((sum, item) => sum + item.amount, 0),
)
const balanceAfterCommitments = computed(() => cashBeforeCreditPayment.value - creditExpense.value - commitmentInstallmentDue.value)
const activeGoals = computed(() => goals.value.filter((goal) => !goal.isArchived))
const archivedGoals = computed(() => goals.value.filter((goal) => goal.isArchived))
const activeGoalSnapshots = computed(() =>
  activeGoals.value.map((goal) => ({
    goal,
    snapshot: calculateGoalSnapshot(goal, goalTransactions.value, marketRates.value, todayKey),
  })),
)
const archivedGoalSnapshots = computed(() =>
  archivedGoals.value.map((goal) => ({
    goal,
    snapshot: calculateGoalSnapshot(goal, goalTransactions.value, marketRates.value, todayKey),
  })),
)
const totalGoalsTarget = computed(() => activeGoalSnapshots.value.reduce((sum, item) => sum + (item.snapshot.currentRequiredAmount ?? item.goal.targetAmount), 0))
const totalGoalsSaved = computed(() => activeGoalSnapshots.value.reduce((sum, item) => sum + item.snapshot.netSavedAmount, 0))
const totalGoalsRemaining = computed(() => activeGoalSnapshots.value.reduce((sum, item) => sum + item.snapshot.remainingAmount, 0))
const nearestGoal = computed(() =>
  [...activeGoalSnapshots.value]
    .sort((a, b) => b.snapshot.progressPercent - a.snapshot.progressPercent || (a.goal.targetDate || '9999/99/99').localeCompare(b.goal.targetDate || '9999/99/99'))[0]?.goal,
)
const activeRecurringItems = computed(() => recurringItems.value.filter((item) => item.isActive))
const recurringSummaries = computed(() =>
  recurringItems.value
    .map((item) => {
      const nextDueDate = getRecurringNextDueDate(item)
      const status = getRecurringStatus(item)

      return {
        ...item,
        nextDueDate,
        status,
        statusLabel: getRecurringStatusLabel(status),
      }
    })
    .sort((a, b) => {
      if (!a.nextDueDate) return 1
      if (!b.nextDueDate) return -1
      return a.nextDueDate.localeCompare(b.nextDueDate)
    }),
)
const dueRecurringItems = computed(() => recurringSummaries.value.filter((item) => item.status === 'due'))
const overdueRecurringItems = computed(() => recurringSummaries.value.filter((item) => item.status === 'overdue'))
const upcomingRecurringItems = computed(() => recurringSummaries.value.filter((item) => item.status === 'upcoming').slice(0, 5))
const monthlyRecurringIncomeTotal = computed(() => activeRecurringItems.value.filter((item) => item.type === 'income').reduce((sum, item) => sum + getMonthlyRecurringAmount(item), 0))
const monthlyRecurringExpenseTotal = computed(() => activeRecurringItems.value.filter((item) => item.type === 'expense').reduce((sum, item) => sum + getMonthlyRecurringAmount(item), 0))
const monthlySubscriptionsTotal = computed(() => activeRecurringItems.value.filter((item) => item.type === 'expense' && item.isSubscription).reduce((sum, item) => sum + getMonthlyRecurringAmount(item), 0))
const cashflowForecastDays = computed<CashflowForecastDay[]>(() =>
  buildCashflowTimeline({
    startDate: todayKey,
    days: getForecastDayCount(),
    openingBalance: balanceAfterCreditPayment.value,
    events: getCashflowEvents(),
    lowBalanceThreshold: Math.max(weeklyBudgetAllowance.value, 1),
  }),
)
const projectedEndOfMonthBalance = computed(() => cashflowForecastDays.value.at(-1)?.projectedBalance ?? balanceAfterCreditPayment.value)
const lowestProjectedBalance = computed(() => cashflowForecastDays.value.reduce((lowest, day) => Math.min(lowest, day.projectedBalance), balanceAfterCreditPayment.value))
const cashflowRiskLevel = computed<CashflowRiskLevel>(() => getCashflowRiskLevel(cashflowForecastDays.value, creditExpense.value > creditLimit.value && creditLimit.value > 0))
const cashflowWarnings = computed(() => {
  const warnings: string[] = []
  if (lowestProjectedBalance.value < 0) warnings.push('احتمال کمبود نقدینگی تا پایان دوره وجود دارد.')
  if (overdueInstallments.value.length) warnings.push('قسط عقب‌افتاده داری.')
  if (dueRecurringItems.value.length || overdueRecurringItems.value.length) warnings.push('پرداخت تکراری نزدیک سررسید است.')
  if (weeklyBudgetAnalysis.value.length) warnings.push('فشار بودجه‌ای در چند دسته دیده می‌شود.')

  return warnings
})
const safeDailySpend = computed(() => {
  const remainingDays = Math.max(cashflowForecastDays.value.length, 1)
  const knownExpense = cashflowForecastDays.value.reduce((sum, day) => sum + day.recurringExpense + day.installmentExpense, 0)
  const goalReserve = Math.round(activeGoals.value.reduce((sum, goal) => sum + getGoalSuggestedWeeklySaving(goal), 0) / 7)
  const available = Math.max(0, balanceAfterCreditPayment.value - knownExpense - goalReserve)

  return Math.floor(available / remainingDays)
})
const safeWeeklySpend = computed(() => safeDailySpend.value * 7)
const purchaseDecision = computed(() => buildPurchaseDecision())
const activeDebts = computed(() => debts.value.filter((debt) => debt.isActive))
const totalDebtRemaining = computed(() => activeDebts.value.reduce((sum, debt) => sum + debt.remainingAmount, 0))
const totalMinimumDebtPayments = computed(() => activeDebts.value.reduce((sum, debt) => sum + debt.minimumMonthlyPayment, 0))
const totalExtraDebtPayments = computed(() => activeDebts.value.reduce((sum, debt) => sum + (debt.extraMonthlyPayment ?? 0), 0))
const snowballDebtPlan = computed(() => calculateDebtPayoffPlan('snowball'))
const avalancheDebtPlan = computed(() => calculateDebtPayoffPlan('avalanche'))
const selectedDebtPayoffPlan = computed(() => (selectedDebtStrategy.value === 'snowball' ? snowballDebtPlan.value : avalancheDebtPlan.value))
const recommendedDebtStrategy = computed<DebtPayoffStrategy>(() => avalancheDebtPlan.value.totalInterest < snowballDebtPlan.value.totalInterest ? 'avalanche' : 'snowball')
const debtFreedomDate = computed(() => formatJalaliInputDate(addJalaliDays(currentJalaliDate, selectedDebtPayoffPlan.value.monthsToPayoff * 30)))
const estimatedInterestSavings = computed(() => Math.max(0, snowballDebtPlan.value.totalInterest - avalancheDebtPlan.value.totalInterest))
const nextDebtDue = computed(() =>
  [...activeDebts.value]
    .filter((debt) => debt.dueDay)
    .sort((a, b) => (a.dueDay ?? 31) - (b.dueDay ?? 31))[0],
)
const activeCategorizationRules = computed(() =>
  [...categorizationRules.value]
    .filter((rule) => rule.isActive)
    .sort((a, b) => a.priority - b.priority),
)
const suggestedCategorizationRules = computed(() => suggestCategorizationRules())
const recentMonthlyIncome = computed(() => getRecentMonthlyIncome(incomeSettings.value.historyMonths))
const irregularIncomeBudget = computed(() => calculateIrregularIncomeBudget(recentMonthlyIncome.value, incomeSettings.value))
const averageMonthlyIncome = computed(() => irregularIncomeBudget.value.averageMonthlyIncome)
const lowestRecentMonthlyIncome = computed(() => irregularIncomeBudget.value.lowestRecentMonthlyIncome)
const highestRecentMonthlyIncome = computed(() => irregularIncomeBudget.value.highestRecentMonthlyIncome)
const incomeVolatilityPercent = computed(() => irregularIncomeBudget.value.incomeVolatilityPercent)
const recommendedBudgetBase = computed(() => irregularIncomeBudget.value.recommendedBudgetBase)
const recommendedEssentialBudget = computed(() => irregularIncomeBudget.value.recommendedEssentialBudget)
const recommendedSavingBudget = computed(() => irregularIncomeBudget.value.recommendedSavingBudget)
const recommendedFlexibleBudget = computed(() => irregularIncomeBudget.value.recommendedFlexibleBudget)
const badMonthReserveSuggestion = computed(() => irregularIncomeBudget.value.badMonthReserveSuggestion)
const irregularIncomeWarnings = computed(() => irregularIncomeBudget.value.warnings.map(getIncomeWarningLabel))
const financialHealthScore = computed(() =>
  calculateFinancialHealthScore({
    monthlyIncome: totalIncome.value || averageMonthlyIncome.value,
    monthlyExpense: totalExpense.value,
    monthlySavings: Math.max(balance.value, 0),
    totalBudget: totalBudget.value,
    overBudgetCategoryCount: categoryTotals.value.filter((item) => item.budget > 0 && item.spent > item.budget).length,
    categoryCount: categoryTotals.value.filter((item) => item.budget > 0).length,
    monthlyDebtPayments: totalMinimumDebtPayments.value + totalExtraDebtPayments.value + monthlyInstallmentDue.value,
    projectedBalance: projectedEndOfMonthBalance.value,
    nonEssentialExpense: nonEssentialExpense.value,
    goalsSaved: totalGoalsSaved.value,
  }, todayKey),
)
const financialHealthLevel = computed(() => financialHealthScore.value.level)
const financialHealthSuggestions = computed(() => financialHealthScore.value.suggestions)
const financialHealthWarnings = computed(() => financialHealthScore.value.warnings)
const financialHealthStrengths = computed(() => financialHealthScore.value.strengths)

const filteredTransactions = computed(() => {
  const normalizedQuery = query.value.trim()
  return transactions.value.filter((item) => {
    const itemDate = normalizeJalaliDate(item.date)
    const category = item.category ? getCategory(item.category).label : 'درآمد'
    const matchesQuery = !normalizedQuery || `${item.title} ${category} ${item.loanPerson ?? ''} ${item.description ?? ''}`.includes(normalizedQuery)
    const matchesCategory = selectedCategory.value === 'همه' || category === selectedCategory.value
    const matchesType =
      selectedType.value === 'همه' ||
      (selectedType.value === 'درآمد' && item.type === 'income') ||
      (selectedType.value === 'هزینه' && item.type === 'expense')
    const matchesStart = !dateRange.start || itemDate >= normalizeJalaliDate(dateRange.start)
    const matchesEnd = !dateRange.end || itemDate <= normalizeJalaliDate(dateRange.end)
    return matchesQuery && matchesCategory && matchesType && matchesStart && matchesEnd
  })
})

const dailyTrend = computed(() => {
  const days = getTrendDays()
  const monthlyExpenses = expenseTransactions.value.filter((item) => normalizeJalaliDate(item.date).startsWith(currentMonthPrefix))
  const monthlyIncomes = incomeTransactions.value.filter((item) => normalizeJalaliDate(item.date).startsWith(currentMonthPrefix))

  return days.map((day) => {
    const spent = monthlyExpenses
      .filter((item) => getJalaliInputDay(item.date) <= day)
      .reduce((sum, item) => sum + item.amount, 0)
    const income = monthlyIncomes
      .filter((item) => getJalaliInputDay(item.date) <= day)
      .reduce((sum, item) => sum + item.amount, 0)

    return { label: toPersianNumber(day), expense: spent, balance: Math.max(0, income - spent) }
  })
})

const hasExpenseData = computed(() => totalExpense.value > 0)
const chartFontFamily = "'Vazirmatn Variable', Vazirmatn, Tahoma, sans-serif"
const moneyInputFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 0,
  useGrouping: true,
})
const chartTextColor = () => (themeMode.value === 'light' ? '#334155' : themeMode.value === 'forest' ? '#ede9fe' : '#cbd5e1')
const chartMutedColor = () => (themeMode.value === 'light' ? '#64748b' : themeMode.value === 'forest' ? '#aaa1c2' : '#94a3b8')
const chartGridColor = () => (themeMode.value === 'light' ? 'rgba(15, 23, 42, .1)' : themeMode.value === 'forest' ? 'rgba(221, 214, 254, .1)' : 'rgba(255, 255, 255, .08)')
const chartTooltipBackground = () => (themeMode.value === 'light' ? 'rgba(255, 255, 255, .96)' : themeMode.value === 'forest' ? 'rgba(29, 24, 50, .97)' : 'rgba(15, 23, 42, .94)')
const chartTooltipBodyColor = () => (themeMode.value === 'light' ? '#0f172a' : themeMode.value === 'forest' ? '#f5f3ff' : '#f8fafc')

const expenseShareChartData = computed<ChartData<'doughnut'>>(() => {
  const items = visibleCategoryTotals.value

  return {
    labels: hasExpenseData.value ? items.map((item) => `${item.icon} ${item.label}`) : ['بدون داده'],
    datasets: [
      {
        data: hasExpenseData.value ? items.map((item) => item.spent) : [1],
        backgroundColor: hasExpenseData.value ? items.map((item) => item.color) : ['rgba(255, 255, 255, .12)'],
        borderColor: 'rgba(15, 23, 42, .78)',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }
})

const categoryBarChartData = computed<ChartData<'bar'>>(() => {
  const items = sortedCategoryTotals.value.slice(0, 10)

  return {
    labels: items.map((item) => `${item.icon} ${item.label}`),
    datasets: [
      {
        label: 'هزینه',
        data: items.map((item) => item.spent),
        backgroundColor: items.map((item) => item.color),
        borderRadius: 10,
        borderSkipped: false,
      },
    ],
  }
})

const trendLineChartData = computed<ChartData<'line'>>(() => ({
  labels: dailyTrend.value.map((point) => point.label),
  datasets: [
    {
      label: 'هزینه تجمعی',
      data: dailyTrend.value.map((point) => point.expense),
      borderColor: '#22d3ee',
      backgroundColor: 'rgba(34, 211, 238, .16)',
      pointBackgroundColor: '#22d3ee',
      pointBorderColor: '#0f172a',
      pointHoverRadius: 6,
      pointRadius: 4,
      fill: true,
      tension: .36,
    },
    {
      label: 'باقی‌مانده',
      data: dailyTrend.value.map((point) => point.balance),
      borderColor: '#a78bfa',
      backgroundColor: 'rgba(167, 139, 250, .1)',
      pointBackgroundColor: '#a78bfa',
      pointBorderColor: '#0f172a',
      pointHoverRadius: 6,
      pointRadius: 4,
      fill: false,
      tension: .36,
    },
  ],
}))

const dailyExpensePoints = computed(() => {
  const monthlyExpenses = expenseTransactions.value.filter((item) => normalizeJalaliDate(item.date).startsWith(currentMonthPrefix))

  return Array.from({ length: currentMonthLength }, (_, index) => {
    const day = index + 1
    const expense = monthlyExpenses
      .filter((item) => getJalaliInputDay(item.date) === day)
      .reduce((sum, item) => sum + item.amount, 0)

    return { label: toPersianNumber(day), expense }
  })
})

const weeklyFlowPoints = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addJalaliDays(currentWeekRange.start, index)
    const dateKey = formatJalaliInputDate(date)
    const label = getWeekdayLabel(date)
    const expense = weeklyExpenseTransactions.value
      .filter((item) => normalizeJalaliDate(item.date) === dateKey)
      .reduce((sum, item) => sum + item.amount, 0)
    const income = weeklyIncomeTransactions.value
      .filter((item) => normalizeJalaliDate(item.date) === dateKey)
      .reduce((sum, item) => sum + item.amount, 0)

    return { label, expense, income }
  }),
)

const budgetAnalysisItems = computed(() =>
  [...categoryTotals.value]
    .filter((item) => item.budget > 0)
    .sort((a, b) => progressPercent(b.spent, b.budget) - progressPercent(a.spent, a.budget))
    .slice(0, 10),
)

const statsExpenseMixChartData = computed<ChartData<'polarArea'>>(() => {
  const items = visibleCategoryTotals.value

  return {
    labels: hasExpenseData.value ? items.map((item) => `${item.icon} ${item.label}`) : ['بدون داده'],
    datasets: [
      {
        data: hasExpenseData.value ? items.map((item) => item.spent) : [1],
        backgroundColor: hasExpenseData.value ? items.map((item) => `${item.color}cc`) : ['rgba(255, 255, 255, .12)'],
        borderColor: hasExpenseData.value ? items.map((item) => item.color) : ['rgba(255, 255, 255, .18)'],
        borderWidth: 1,
      },
    ],
  }
})

const statsBudgetUsageChartData = computed<ChartData<'bar'>>(() => ({
  labels: budgetAnalysisItems.value.map((item) => `${item.icon} ${item.label}`),
  datasets: [
    {
      label: 'مصرف شده',
      data: budgetAnalysisItems.value.map((item) => Math.min(item.spent, item.budget || item.spent)),
      backgroundColor: '#22d3ee',
      borderRadius: 8,
      borderSkipped: false,
      stack: 'budget',
    },
    {
      label: 'مانده بودجه',
      data: budgetAnalysisItems.value.map((item) => Math.max(item.budget - item.spent, 0)),
      backgroundColor: 'rgba(148, 163, 184, .26)',
      borderRadius: 8,
      borderSkipped: false,
      stack: 'budget',
    },
    {
      label: 'بیش از بودجه',
      data: budgetAnalysisItems.value.map((item) => Math.max(item.spent - item.budget, 0)),
      backgroundColor: '#fb7185',
      borderRadius: 8,
      borderSkipped: false,
      stack: 'over',
    },
  ],
}))

const statsDailyExpenseChartData = computed<ChartData<'line'>>(() => ({
  labels: dailyExpensePoints.value.map((point) => point.label),
  datasets: [
    {
      label: 'خرج روزانه',
      data: dailyExpensePoints.value.map((point) => point.expense),
      borderColor: '#22d3ee',
      backgroundColor: 'rgba(34, 211, 238, .18)',
      pointBackgroundColor: '#22d3ee',
      pointBorderColor: '#0f172a',
      pointRadius: 3,
      pointHoverRadius: 6,
      fill: true,
      tension: .32,
    },
    {
      label: 'میانگین روزانه',
      data: dailyExpensePoints.value.map(() => averageDailyExpense.value),
      borderColor: '#facc15',
      borderDash: [7, 6],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
  ],
}))

const statsWeeklyFlowChartData = computed<ChartData<'bar'>>(() => ({
  labels: weeklyFlowPoints.value.map((point) => point.label),
  datasets: [
    {
      label: 'درآمد هفتگی',
      data: weeklyFlowPoints.value.map((point) => point.income),
      backgroundColor: '#34d399',
      borderRadius: 8,
      borderSkipped: false,
    },
    {
      label: 'هزینه هفتگی',
      data: weeklyFlowPoints.value.map((point) => point.expense),
      backgroundColor: '#fb7185',
      borderRadius: 8,
      borderSkipped: false,
    },
  ],
}))

const statsCashFlowChartData = computed<ChartData<'bar'>>(() => {
  if (cashFlowMode.value === 'afterCredit') {
    return {
      labels: ['پول کل', 'بدهی اعتبار', 'مانده واقعی'],
      datasets: [
        {
          label: 'بعد از پرداخت اعتبار',
          data: [cashBeforeCreditPayment.value, creditExpense.value, balanceAfterCreditPayment.value],
          backgroundColor: ['#34d399', '#fb7185', '#60a5fa'],
          borderRadius: 12,
          borderSkipped: false,
        },
      ],
    }
  }

  if (cashFlowMode.value === 'afterCommitments') {
    return {
      labels: ['پول کل', 'بدهی اعتبار', 'قسط‌ها', 'مانده واقعی'],
      datasets: [
        {
          label: 'بعد از تعهدات',
          data: [cashBeforeCreditPayment.value, creditExpense.value, commitmentInstallmentDue.value, balanceAfterCommitments.value],
          backgroundColor: ['#34d399', '#fb7185', '#facc15', '#60a5fa'],
          borderRadius: 12,
          borderSkipped: false,
        },
      ],
    }
  }

  return {
    labels: ['درآمد', 'هزینه', 'پس‌انداز'],
    datasets: [
      {
        label: currentMonthYear,
        data: [totalIncome.value, totalExpense.value, Math.max(balance.value, 0)],
        backgroundColor: ['#34d399', '#fb7185', '#60a5fa'],
        borderRadius: 12,
        borderSkipped: false,
      },
    ],
  }
})

const statsEssentialChartData = computed<ChartData<'doughnut'>>(() => ({
  labels: ['ضروری', 'غیرضروری'],
  datasets: [{
    data: [essentialExpense.value, nonEssentialExpense.value],
    backgroundColor: ['#34d399', '#fb7185'],
    borderColor: 'rgba(15, 23, 42, .78)',
    borderWidth: 2,
    hoverOffset: 8,
  }],
}))

const statsPaymentMethodChartData = computed<ChartData<'bar'>>(() => {
  const cash = expenseTransactions.value.filter((item) => item.paymentMethod !== 'credit').reduce((sum, item) => sum + item.amount, 0)
  const credit = expenseTransactions.value.filter((item) => item.paymentMethod === 'credit').reduce((sum, item) => sum + item.amount, 0)
  return {
    labels: ['نقدی / کارت', 'اعتباری'],
    datasets: [{
      label: 'هزینه',
      data: [cash, credit],
      backgroundColor: ['#60a5fa', '#a78bfa'],
      borderRadius: 10,
      borderSkipped: false,
    }],
  }
})

const monthlyTrendPoints = computed(() =>
  Array.from({ length: 6 }, (_, index) => {
    const date = addJalaliMonths(currentJalaliDate, index - 5)
    const prefix = getJalaliMonthPrefix(date)
    const monthTransactions = transactions.value.filter((item) => normalizeJalaliDate(item.date).startsWith(prefix))
    const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expense = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)

    return {
      label: months[date.month - 1],
      income,
      expense,
      saving: income - expense,
    }
  }),
)

const hasMonthlyTrendData = computed(() => monthlyTrendPoints.value.some((point) => point.income > 0 || point.expense > 0))
const commitmentTotal = computed(() => creditExpense.value + monthlyInstallmentDue.value + monthlyRecurringExpenseTotal.value + totalMinimumDebtPayments.value + totalExtraDebtPayments.value)
const flexibleAfterCommitments = computed(() => Math.max(totalIncome.value - commitmentTotal.value, 0))

const statsMonthlyTrendChartData = computed<ChartData<'line'>>(() => ({
  labels: monthlyTrendPoints.value.map((point) => point.label),
  datasets: [
    {
      label: 'درآمد',
      data: monthlyTrendPoints.value.map((point) => point.income),
      borderColor: '#34d399',
      backgroundColor: 'rgba(52, 211, 153, .12)',
      pointBackgroundColor: '#34d399',
      pointBorderColor: '#0f172a',
      fill: false,
      tension: .32,
    },
    {
      label: 'هزینه',
      data: monthlyTrendPoints.value.map((point) => point.expense),
      borderColor: '#fb7185',
      backgroundColor: 'rgba(251, 113, 133, .12)',
      pointBackgroundColor: '#fb7185',
      pointBorderColor: '#0f172a',
      fill: false,
      tension: .32,
    },
    {
      label: 'مانده',
      data: monthlyTrendPoints.value.map((point) => point.saving),
      borderColor: '#60a5fa',
      backgroundColor: 'rgba(96, 165, 250, .16)',
      pointBackgroundColor: '#60a5fa',
      pointBorderColor: '#0f172a',
      fill: true,
      tension: .32,
    },
  ],
}))

const statsCommitmentChartData = computed<ChartData<'doughnut'>>(() => ({
  labels: ['اعتبار', 'قسط', 'تکرارشونده', 'بدهی', 'آزاد'],
  datasets: [{
    data: [
      creditExpense.value,
      monthlyInstallmentDue.value,
      monthlyRecurringExpenseTotal.value,
      totalMinimumDebtPayments.value + totalExtraDebtPayments.value,
      flexibleAfterCommitments.value,
    ],
    backgroundColor: ['#fb7185', '#facc15', '#a78bfa', '#f97316', '#34d399'],
    borderColor: 'rgba(15, 23, 42, .78)',
    borderWidth: 2,
    hoverOffset: 8,
  }],
}))

const incomeChangePercent = computed(() => getChangePercent(totalIncome.value, previousIncome.value))
const expenseChangePercent = computed(() => getChangePercent(totalExpense.value, previousExpense.value))
const projectedSavings = computed(() => {
  const elapsedDays = Math.max(currentJalaliDate.day, 1)
  const projectedExpense = Math.round((totalExpense.value / elapsedDays) * currentMonthLength)

  return Math.max(0, totalIncome.value - projectedExpense)
})

const summaryLines = computed(() => [
  ...(totalBudget.value > 0 ? [`این ماه ${toPersianNumber(budgetUsage.value)}٪ بودجه مصرف شده است.`] : []),
  hasExpenseData.value ? `بیشترین هزینه مربوط به ${safeMaxCategory.value.label ?? 'بدون دسته'} بوده است.` : 'هنوز هزینه‌ای برای این ماه ثبت نشده است.',
  formatChangeSentence(expenseChangePercent.value, 'هزینه نسبت به ماه قبل افزایش داشته است.', 'هزینه نسبت به ماه قبل کمتر شده است.', 'هزینه نسبت به ماه قبل تغییری نکرده است.'),
])

const insights = computed(() => [
  `💡 ${formatChangeSentence(incomeChangePercent.value, 'درآمدتان نسبت به ماه قبل رشد کرده است.', 'درآمدتان نسبت به ماه قبل کمتر شده است.', 'درآمدتان نسبت به ماه قبل ثابت مانده است.')}`,
  hasExpenseData.value ? `💡 بیشترین هزینه شما مربوط به ${safeMaxCategory.value.label ?? 'غذا'} است.` : '💡 با ثبت اولین هزینه، دسته‌های پرمصرف همین‌جا مشخص می‌شوند.',
  `💡 اگر با همین روند ادامه دهید تا پایان ماه حدود ${formatCompact(projectedSavings.value)} پس‌انداز خواهید داشت.`,
])

const dashboardCards = computed(() => [
  { label: 'خرج هفتگی', value: weeklyExpense.value, icon: '💸', hint: `${toPersianNumber(currentWeekTransactions.value.length)} تراکنش در هفته جاری`, className: 'card-cyan' },
  { label: 'هزینه ماه', value: totalExpense.value, icon: '💸', hint: formatPercentHint(expenseChangePercent.value, 'ماه قبل'), className: 'card-violet' },
  { label: 'مانده واقعی', value: balanceAfterCommitments.value, icon: '💵', hint: 'بعد از اعتبار و قسط‌های سررسید', className: 'card-blue' },
  { label: 'پرداخت اعتبار', value: creditExpense.value, icon: '💳', hint: 'جمع خرج‌های اعتباری این ماه', className: 'card-pink' },
  { label: 'خرج امن امروز', value: safeDailySpend.value, icon: '🧭', hint: getRiskLabel(cashflowRiskLevel.value), className: 'card-cyan' },
  { label: 'هدف‌های مالی', value: totalGoalsSaved.value, icon: '🎯', hint: `${formatCompact(totalGoalsRemaining.value)} مانده`, className: 'card-violet' },
  { label: 'بدهی‌ها', value: totalDebtRemaining.value, icon: '📉', hint: nextDebtDue.value ? `سررسید ${toPersianNumber(nextDebtDue.value.dueDay ?? '')}` : debtFreedomDate.value, className: 'card-blue' },
  { label: 'سلامت مالی', value: financialHealthScore.value.totalScore, suffix: '/۱۰۰', icon: '🫀', hint: getFinancialHealthLevelLabel(financialHealthLevel.value), className: 'card-pink' },
  ...(incomeVolatilityPercent.value >= 35 ? [{ label: 'درآمد نامنظم', value: recommendedBudgetBase.value, icon: '〽️', hint: `${toPersianNumber(incomeVolatilityPercent.value)}٪ نوسان`, className: 'card-cyan' }] : []),
])

const widgets = computed(() => [
  { label: 'امروز', value: today, icon: '📅' },
  { label: 'خرج امروز', value: formatMoney(todayExpense.value), icon: '💸' },
  { label: 'درآمد امروز', value: formatMoney(todayIncome.value), icon: '💰' },
  { label: 'اعتبار مانده', value: formatMoney(creditRemaining.value), icon: '💳' },
  { label: 'قسط ماه', value: formatMoney(monthlyInstallmentDue.value), icon: '🧾' },
  { label: 'سررسید نزدیک', value: toPersianNumber(dueRecurringItems.value.length + overdueRecurringItems.value.length + upcomingRecurringItems.value.length), icon: '⏱' },
])

const statsItems = computed(() => [
  { label: 'درآمد هفته', value: formatMoney(weeklyIncome.value) },
  { label: 'هزینه هفته', value: formatMoney(weeklyExpense.value) },
  { label: 'مانده هفته', value: formatMoney(weeklyBalance.value) },
  { label: 'خرج اعتباری هفته', value: formatMoney(weeklyCreditExpense.value) },
  { label: 'پرداخت آخر ماه', value: formatMoney(creditExpense.value) },
  { label: 'اعتبار باقی‌مانده', value: formatMoney(creditRemaining.value) },
  { label: 'پول کل قبل اعتبار', value: formatMoney(cashBeforeCreditPayment.value) },
  { label: 'مانده بعد اعتبار', value: formatMoney(balanceAfterCreditPayment.value) },
  { label: 'قسط‌های این ماه', value: formatMoney(monthlyInstallmentDue.value) },
  { label: 'قسط عقب‌افتاده', value: toPersianNumber(overdueInstallments.value.length) },
  { label: 'مانده بعد تعهدات', value: formatMoney(balanceAfterCommitments.value) },
  { label: 'خرج ضروری', value: formatMoney(essentialExpense.value) },
  { label: 'خرج غیرضروری', value: formatMoney(nonEssentialExpense.value) },
  { label: 'پول قرض‌داده‌شده', value: formatMoney(loanedExpense.value) },
  { label: 'تراکنش‌های هفته', value: toPersianNumber(currentWeekTransactions.value.length) },
  { label: 'بیشترین هزینه', value: `${highestExpense.value.title} · ${formatMoney(highestExpense.value.amount)}` },
  { label: 'کمترین هزینه', value: `${lowestExpense.value.title} · ${formatMoney(lowestExpense.value.amount)}` },
  { label: 'بیشترین دسته خرج', value: hasExpenseData.value ? `${safeMaxCategory.value.icon} ${safeMaxCategory.value.label}` : 'بدون داده' },
  { label: 'میانگین خرج روزانه', value: formatMoney(averageDailyExpense.value) },
  { label: 'درصد پس انداز', value: `${toPersianNumber(savingsPercent.value)}٪` },
  { label: 'تعداد تراکنش‌ها', value: toPersianNumber(currentMonthTransactions.value.length) },
  { label: 'بودجه کل ماه', value: formatMoney(totalBudget.value) },
  { label: 'پیش‌بینی پس‌انداز', value: formatCompact(projectedSavings.value) },
])

function getCategory(key?: CategoryKey) {
  return categories.value.find((category) => category.key === key) ?? categories.value.find((category) => category.key === 'other') ?? defaultCategories[defaultCategories.length - 1]
}

function normalizeDigits(value: string | number) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
}

function normalizeJalaliDate(value: string) {
  const parts = normalizeDigits(value.trim()).replace(/-/g, '/').split('/')
  if (parts.length !== 3) return normalizeDigits(value.trim()).replace(/-/g, '/')

  const [year, month, day] = parts.map((part) => part.trim())
  if (!year || !month || !day) return normalizeDigits(value.trim()).replace(/-/g, '/')

  return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`
}

function getJalaliInputDay(value: string) {
  return Number(normalizeJalaliDate(value).split('/')[2] ?? 0)
}

function getTrendDays() {
  return [...new Set([1, 5, 10, 15, 20, 25, currentMonthLength].filter((day) => day <= currentMonthLength))].sort((a, b) => a - b)
}

function getPreviousMonthPrefix(date: ReturnType<typeof toJalali>) {
  const month = date.month === 1 ? 12 : date.month - 1
  const year = date.month === 1 ? date.year - 1 : date.year

  return `${year}/${String(month).padStart(2, '0')}/`
}

function addJalaliMonths(date: ReturnType<typeof toJalali>, count: number) {
  const monthIndex = date.month - 1 + count
  const year = date.year + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12 + 1
  const day = Math.min(date.day, getJalaliMonthLength(year, month))

  return { year, month, day }
}

function getInstallmentDueDate(plan: InstallmentPlan, index: number) {
  const start = parseJalaliInput(plan.startDate) ?? currentJalaliDate
  const dueMonth = addJalaliMonths(start, index)
  const day = Math.min(Math.max(1, plan.dueDay), getJalaliMonthLength(dueMonth.year, dueMonth.month))

  return formatJalaliInputDate({ ...dueMonth, day })
}

function getInstallmentStatus(plan: InstallmentPlan) {
  if (plan.paidCount >= plan.totalCount) return 'completed'

  const dueDate = getInstallmentDueDate(plan, plan.paidCount)
  const upcomingLimit = formatJalaliInputDate(addJalaliDays(currentJalaliDate, 7))

  if (dueDate < todayKey) return 'overdue'
  if (dueDate <= upcomingLimit) return 'upcoming'

  return 'active'
}

function getInstallmentStatusLabel(status: string) {
  if (status === 'completed') return 'تکمیل‌شده'
  if (status === 'overdue') return 'عقب‌افتاده'
  if (status === 'upcoming') return 'سررسید نزدیک'

  return 'فعال'
}

function getCurrentWeekRange(date: ReturnType<typeof toJalali>) {
  const gregorian = toGregorian(date.year, date.month, date.day)
  const weekday = new Date(`${gregorian}T00:00:00`).getDay()
  const daysFromSaturday = (weekday + 1) % 7
  const start = addJalaliDays(date, -daysFromSaturday)

  return {
    start,
    end: addJalaliDays(start, 6),
  }
}

function getWeekdayLabel(date: ReturnType<typeof toJalali>) {
  const labels = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']
  const gregorian = toGregorian(date.year, date.month, date.day)

  return labels[new Date(`${gregorian}T00:00:00`).getDay()]
}

function getJalaliMonthPrefix(date: ReturnType<typeof toJalali>) {
  return `${date.year}/${String(date.month).padStart(2, '0')}/`
}

function getCurrentJalaliDate() {
  return toJalali(new Date())
}

function formatJalaliInputDate(date: ReturnType<typeof toJalali>) {
  return `${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`
}

function formatDisplayJalaliDate(date: ReturnType<typeof toJalali>) {
  return formatJalaliInputDate(date).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}

function jalaliInputToIso(value: string) {
  const parsed = parseJalaliInput(value)

  return parsed ? toGregorian(parsed.year, parsed.month, parsed.day) : null
}

function isoToJalaliInput(value: string) {
  return formatJalaliInputDate(toJalali(value))
}

function toPersianNumber(value: number | string) {
  return new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(Number(String(value).replace(/\D/g, '') || value))
}

function parseMoneyInput(value: number | string) {
  const normalized = normalizeDigits(value).replace(/[^\d]/g, '')

  return Number(normalized || 0)
}

function formatMoneyInput(value: number | string) {
  const amount = parseMoneyInput(value)
  return amount ? moneyInputFormatter.format(amount) : ''
}

function formatMoneyWords(value: number | string) {
  const amount = parseMoneyInput(value)
  if (!amount) return ''

  return `${numberToPersianWords(amount)} تومان`
}

function numberToPersianWords(value: number) {
  const amount = Math.trunc(Math.abs(value))
  if (!amount) return 'صفر'
  if (!Number.isSafeInteger(amount)) return new Intl.NumberFormat('fa-IR').format(amount)

  const parts: string[] = []
  let remaining = amount
  let scaleIndex = 0

  while (remaining > 0 && scaleIndex < persianScales.length) {
    const chunk = remaining % 1000
    if (chunk) {
      parts.unshift([chunkToPersianWords(chunk), persianScales[scaleIndex]].filter(Boolean).join(' '))
    }

    remaining = Math.floor(remaining / 1000)
    scaleIndex += 1
  }

  if (remaining > 0) parts.unshift(new Intl.NumberFormat('fa-IR').format(remaining))

  return parts.join(' و ')
}

function chunkToPersianWords(value: number) {
  const parts: string[] = []
  const hundreds = Math.floor(value / 100)
  const remainder = value % 100

  if (hundreds) parts.push(persianHundreds[hundreds])
  if (remainder >= 10 && remainder < 20) {
    parts.push(persianTeens[remainder - 10])
  } else {
    const tens = Math.floor(remainder / 10)
    const ones = remainder % 10
    if (tens) parts.push(persianTens[tens])
    if (ones) parts.push(persianOnes[ones])
  }

  return parts.join(' و ')
}

function updateMoneyInput(target: { amount?: number; budget?: number }, key: 'amount' | 'budget', event: Event) {
  const input = event.target as HTMLInputElement
  const amount = parseMoneyInput(input.value)
  target[key] = amount
  input.value = formatMoneyInput(amount)
}

function updateCreditLimit(event: Event) {
  const input = event.target as HTMLInputElement
  const amount = Math.max(0, parseMoneyInput(input.value))
  creditLimit.value = amount
  input.value = formatMoneyInput(amount)
}

function applyTheme(mode = themeMode.value) {
  if (typeof document === 'undefined') return

  document.body.classList.toggle('budgetyar-light', mode === 'light')
  document.body.classList.toggle('budgetyar-dark', mode === 'dark')
  document.body.classList.toggle('budgetyar-forest', mode === 'forest')
}

function setThemeMode(mode: ThemeMode) {
  themeMode.value = mode
  applyTheme(mode)
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
}

function formatCompact(value: number) {
  const absValue = Math.abs(value)
  const formatter = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })

  if (absValue >= 1000000) return `${formatter.format(value / 1000000)} میلیون تومان`
  if (absValue >= 1000) return `${formatter.format(value / 1000)} هزار تومان`
  return formatMoney(value)
}

function progressPercent(spent: number, budget: number) {
  return Math.min(100, Math.round((spent / Math.max(budget, 1)) * 100))
}

function getChangePercent(current: number, previous: number) {
  if (!previous) return current ? 100 : 0

  return Math.round(((current - previous) / previous) * 100)
}

function formatPercentHint(percent: number, baseline: string) {
  if (percent > 0) return `${toPersianNumber(percent)}٪ بیشتر از ${baseline}`
  if (percent < 0) return `${toPersianNumber(Math.abs(percent))}٪ کمتر از ${baseline}`

  return `بدون تغییر نسبت به ${baseline}`
}

function formatChangeSentence(percent: number, increaseText: string, decreaseText: string, neutralText: string) {
  if (percent > 0) return `${toPersianNumber(percent)}٪ ${increaseText}`
  if (percent < 0) return `${toPersianNumber(Math.abs(percent))}٪ ${decreaseText}`

  return neutralText
}

function selectSection(item: string) {
  activeSection.value = item
  isMobileMenuOpen.value = false

  if (item === 'درآمدها') selectedType.value = 'درآمد'
  if (item === 'هزینه‌ها') selectedType.value = 'هزینه'
  if (item === 'داشبورد') selectedType.value = 'همه'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openModal(type: TransactionType) {
  formType.value = type
  editingId.value = null
  Object.assign(form, {
    amount: 0,
    title: '',
    date: todayKey,
    category: categories.value[0]?.key ?? 'other',
    description: '',
    paymentMethod: 'cash',
    isEssential: true,
    isLoan: false,
    loanPerson: '',
  })
  isModalOpen.value = true
}

function editTransaction(item: Transaction) {
  formType.value = item.type
  editingId.value = item.id
  Object.assign(form, {
    amount: item.amount,
    title: item.title,
    date: item.date,
    category: item.category ?? 'food',
    description: item.description ?? '',
    paymentMethod: item.paymentMethod ?? 'cash',
    isEssential: item.isEssential ?? true,
    isLoan: item.isLoan ?? false,
    loanPerson: item.loanPerson ?? '',
  })
  isModalOpen.value = true
}

function saveTransaction() {
  if (!form.title || !form.amount || !form.date) return
  if (formType.value === 'expense' && form.isLoan && !form.loanPerson.trim()) {
    pushToast('نام شخص را وارد کنید')
    return
  }

  let payload: Transaction = {
    id: editingId.value ?? Date.now(),
    type: formType.value,
    title: form.title,
    amount: Number(form.amount),
    date: normalizeJalaliDate(form.date),
    category: formType.value === 'expense' ? form.category : undefined,
    description: form.description,
    paymentMethod: formType.value === 'expense' ? form.paymentMethod : undefined,
    isEssential: formType.value === 'expense' ? form.isEssential : undefined,
    isLoan: formType.value === 'expense' ? form.isLoan : undefined,
    loanPerson: formType.value === 'expense' && form.isLoan ? form.loanPerson.trim() : undefined,
  }

  if (editingId.value) {
    transactions.value = transactions.value.map((item) => (item.id === editingId.value ? payload : item))
    pushToast('ویرایش شد ✨')
  } else {
    transactions.value = [payload, ...transactions.value]
    pushToast('ثبت شد ✅')
  }

  isModalOpen.value = false
}

function removeTransaction(id: number) {
  transactions.value = transactions.value.filter((item) => item.id !== id)
  pushToast('حذف شد 🗑️')
}

async function refreshBankNotifications(showToast = false) {
  if (!isAndroidNative.value) return

  isNotificationsLoading.value = true
  try {
    const [status, apps, suggestions] = await Promise.all([
      BankNotifications.getStatus(),
      BankNotifications.getSelectableApps(),
      BankNotifications.getSuggestions(),
    ])

    Object.assign(bankNotificationStatus, status)
    bankApps.value = apps.apps
    bankSuggestions.value = suggestions.suggestions
    selectedBankPackage.value = status.selectedPackage
    if (showToast) pushToast('اعلان‌ها به‌روزرسانی شد')
  } catch {
    pushToast('خواندن اعلان‌ها در این نسخه در دسترس نیست')
  } finally {
    isNotificationsLoading.value = false
  }
}

async function openNotificationAccessSettings() {
  if (!isAndroidNative.value) return

  await BankNotifications.openNotificationSettings()
  window.setTimeout(() => refreshBankNotifications(), 900)
}

async function updateSelectedBankPackage(event: Event) {
  const packageName = (event.target as HTMLSelectElement).value
  selectedBankPackage.value = packageName

  if (!isAndroidNative.value) return

  try {
    await BankNotifications.setSelectedPackage({ packageName })
    await refreshBankNotifications()
    pushToast(packageName ? 'بلو بانک انتخاب شد' : 'انتخاب اپ پاک شد')
  } catch {
    pushToast('انتخاب اپ ذخیره نشد')
  }
}

async function acceptBankSuggestion(suggestion: BankNotificationSuggestion) {
  const category = categories.value.some((item) => item.key === suggestion.category)
    ? suggestion.category
    : categories.value.some((item) => item.key === 'shopping')
      ? 'shopping'
      : 'other'

  const date = suggestion.postTime ? formatJalaliInputDate(toJalali(new Date(suggestion.postTime))) : todayKey
  const payload: Transaction = {
    id: Date.now(),
    type: 'expense',
    title: suggestion.title || 'هزینه بلو بانک',
    amount: suggestion.amount,
    date,
    category,
    description: `ثبت‌شده از اعلان ${suggestion.sourceApp}\n${suggestion.rawText}`,
    paymentMethod: 'cash',
    isEssential: true,
    isLoan: false,
    sourceType: 'bank-notification',
    sourceId: suggestion.id,
    sourceDate: date,
  }

  transactions.value = [payload, ...transactions.value]
  bankSuggestions.value = bankSuggestions.value.filter((item) => item.id !== suggestion.id)
  await markBankSuggestion(suggestion.id, 'accepted')
  pushToast('هزینه از اعلان ثبت شد ✅')
}

async function dismissBankSuggestion(id: string) {
  bankSuggestions.value = bankSuggestions.value.filter((item) => item.id !== id)
  await markBankSuggestion(id, 'dismissed')
  pushToast('پیشنهاد رد شد')
}

async function markBankSuggestion(id: string, action: 'accepted' | 'dismissed') {
  if (!isAndroidNative.value) return

  try {
    await BankNotifications.markSuggestion({ id, action })
  } catch {
    await refreshBankNotifications()
  }
}

function formatSuggestionDate(postTime: number) {
  if (!postTime) return todayKey

  return formatDisplayJalaliDate(toJalali(new Date(postTime)))
}

function updateBudget(category: CategoryKey, event: Event) {
  const input = event.target as HTMLInputElement
  const amount = Math.max(0, parseMoneyInput(input.value))
  budgets.value = budgets.value.map((goal) => (goal.category === category ? { ...goal, budget: amount } : goal))
  input.value = formatMoneyInput(amount)
  pushToast('بودجه به‌روزرسانی شد ✨')
}

function addCategory() {
  const label = categoryForm.label.trim()
  const icon = categoryForm.icon.trim() || '✨'

  if (!label) return

  const key = `custom-${Date.now()}`
  const colorPalette = ['#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#2dd4bf', '#fb923c']
  const color = colorPalette[categories.value.length % colorPalette.length]

  categories.value = [...categories.value, { key, label, icon, color }]
  budgets.value = [...budgets.value, { category: key, budget: Math.max(0, Number(categoryForm.budget) || 0) }]
  Object.assign(categoryForm, { label: '', icon: '✨', budget: 1000000 })
  pushToast('دسته‌بندی اضافه شد ✅')
}

function deleteCategory(key: CategoryKey) {
  if (key === 'other') {
    pushToast('دسته سایر قابل حذف نیست')
    return
  }

  const deleted = getCategory(key)
  categories.value = categories.value.filter((category) => category.key !== key)
  budgets.value = budgets.value.filter((goal) => goal.category !== key)
  transactions.value = transactions.value.map((item) => (item.category === key ? { ...item, category: 'other' } : item))

  if (form.category === key) form.category = 'other'
  if (selectedCategory.value === deleted.label) selectedCategory.value = 'همه'

  pushToast('دسته‌بندی حذف شد 🗑️')
}

function resetInstallmentForm() {
  editingInstallmentId.value = null
  Object.assign(installmentForm, {
    title: '',
    amount: 0,
    category: 'other',
    startDate: todayKey,
    dueDay: currentJalaliDate.day,
    totalCount: 12,
    description: '',
    paymentMethod: 'cash',
  })
}

function addInstallmentPlan() {
  const title = installmentForm.title.trim()
  const amount = Math.max(0, Number(installmentForm.amount) || 0)
  const existingPlan = editingInstallmentId.value
    ? installments.value.find((item) => item.id === editingInstallmentId.value)
    : undefined
  const totalCount = Math.max(1, existingPlan?.paidCount ?? 0, Math.trunc(Number(installmentForm.totalCount) || 0))
  const dueDay = Math.min(31, Math.max(1, Math.trunc(Number(installmentForm.dueDay) || 1)))

  if (!title || !amount || !installmentForm.startDate) return

  const plan: InstallmentPlan = {
    id: Date.now(),
    title,
    amount,
    category: installmentForm.category,
    startDate: normalizeJalaliDate(installmentForm.startDate),
    dueDay,
    totalCount,
    paidCount: 0,
    description: installmentForm.description,
    paymentMethod: installmentForm.paymentMethod,
  }

  if (existingPlan) {
    installments.value = installments.value.map((item) =>
      item.id === existingPlan.id ? { ...plan, id: existingPlan.id, paidCount: existingPlan.paidCount } : item,
    )
    resetInstallmentForm()
    pushToast('قسط ویرایش شد ✅')
    return
  }

  installments.value = [plan, ...installments.value]
  resetInstallmentForm()
  pushToast('قسط اضافه شد ✅')
}

function editInstallmentPlan(plan: InstallmentPlan) {
  editingInstallmentId.value = plan.id
  Object.assign(installmentForm, {
    title: plan.title,
    amount: plan.amount,
    category: plan.category,
    startDate: plan.startDate,
    dueDay: plan.dueDay,
    totalCount: plan.totalCount,
    description: plan.description ?? '',
    paymentMethod: plan.paymentMethod,
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelInstallmentEdit() {
  resetInstallmentForm()
}

function payInstallment(plan: InstallmentPlan) {
  if (plan.paidCount >= plan.totalCount) return

  const dueDate = getInstallmentDueDate(plan, plan.paidCount)
  const transaction: Transaction = {
    id: Date.now(),
    type: 'expense',
    title: `قسط: ${plan.title}`,
    amount: plan.amount,
    date: todayKey,
    category: plan.category,
    description: [`سررسید قسط: ${dueDate}`, plan.description].filter(Boolean).join('\n'),
    paymentMethod: plan.paymentMethod,
    isEssential: true,
    isLoan: false,
    sourceType: 'installment',
    sourceId: String(plan.id),
    sourceDate: dueDate,
  }

  transactions.value = [transaction, ...transactions.value]
  installments.value = installments.value.map((item) =>
    item.id === plan.id ? { ...item, paidCount: Math.min(item.paidCount + 1, item.totalCount) } : item,
  )
  pushToast('قسط پرداخت و هزینه ثبت شد ✅')
}

function removeInstallmentPlan(id: number) {
  installments.value = installments.value.filter((item) => item.id !== id)
  if (editingInstallmentId.value === id) resetInstallmentForm()
  pushToast('قسط حذف شد')
}

function getGoalSnapshot(goal: BudgetyarGoal) {
  return calculateGoalSnapshot(goal, goalTransactions.value, marketRates.value, todayKey)
}

function getGoalSummary(goal: BudgetyarGoal) {
  return getGoalSnapshot(goal)
}

function getGoalMarketPrice(goal: BudgetyarGoal) {
  return getGoalSnapshot(goal).currentMarketPrice
}

function getGoalSavedValue(goal: BudgetyarGoal) {
  const snapshot = getGoalSnapshot(goal)
  return goal.trackingMode === 'ASSET_HOLDING' ? snapshot.currentMarketValue ?? snapshot.currentQuantity : snapshot.netSavedAmount
}

function getGoalTargetValue(goal: BudgetyarGoal) {
  const snapshot = getGoalSnapshot(goal)
  return snapshot.currentRequiredAmount ?? goal.targetAmount
}

function buildGoalTransaction(goal: BudgetyarGoal, type: BudgetyarGoalTransaction['type'], amount: number, note?: string): BudgetyarGoalTransaction {
  const normalizedAmount = Math.max(0, amount)
  const marketPrice = getGoalMarketPrice(goal) ?? 0
  const isAssetMode = goal.trackingMode === 'ASSET_HOLDING'
  const quantity = isAssetMode ? normalizedAmount : 0

  return {
    id: `${goal.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    goalId: goal.id,
    type,
    baseAmount: isAssetMode ? Math.round(quantity * marketPrice) : normalizedAmount,
    quantity,
    unitPrice: marketPrice,
    fee: 0,
    currency: goal.baseCurrency ?? 'irr',
    assetCode: goal.assetCode || goal.unit,
    occurredAt: todayKey,
    note,
    idempotencyKey: `${goal.id}-${type}-${Date.now()}`,
    createdAt: todayKey,
  }
}

function refreshGoalState(id: string) {
  const goal = goals.value.find((item) => item.id === id)
  if (!goal) return

  const snapshot = getGoalSnapshot(goal)
  const nextGoal: BudgetyarGoal = {
    ...goal,
    targetAmount: goal.trackingMode === 'ASSET_FUNDING'
      ? (snapshot.currentRequiredAmount ?? goal.targetAmount)
      : goal.trackingMode === 'ASSET_HOLDING'
        ? (goal.targetQuantity ?? goal.targetAmount)
        : goal.targetAmount,
    savedAmount: goal.trackingMode === 'ASSET_HOLDING' ? snapshot.currentQuantity : snapshot.netSavedAmount,
    status: goal.isArchived ? 'archived' : snapshot.progressPercent >= 100 ? 'completed' : goal.status ?? 'active',
    updatedAt: todayKey,
  }

  goals.value = goals.value.map((item) => (item.id === id ? nextGoal : item))
}

function resetGoalForm() {
  editingGoalId.value = null
  Object.assign(goalForm, {
    title: '',
    targetAmount: 0,
    savedAmount: 0,
    unit: 'irr',
    trackingMode: 'FIXED_MONEY',
    baseCurrency: 'irr',
    targetQuantity: 0,
    assetCode: '',
    targetValuePolicy: 'NOMINAL',
    inflationRate: 0,
    priceSource: '',
    contributionFrequency: 'monthly',
    plannedContribution: 0,
    reminderPolicy: 'before-due',
    commitmentMode: 'NONE',
    coolingOffPeriod: 0,
    targetDate: '',
    categoryId: '',
    priority: 'medium',
    icon: '🎯',
    color: '#22d3ee',
    note: '',
  })
}

function addGoal() {
  const title = goalForm.title.trim()
  const targetAmount = Math.max(0, Number(goalForm.targetAmount) || 0)
  const targetQuantity = Math.max(0, Number(goalForm.targetQuantity) || 0)
  const savedAmount = Math.max(0, Number(goalForm.savedAmount) || 0)
  if (!title) return
  if (goalForm.trackingMode === 'FIXED_MONEY' && !targetAmount) return
  if (goalForm.trackingMode !== 'FIXED_MONEY' && !targetQuantity && !targetAmount) return

  const existing = editingGoalId.value ? goals.value.find((goal) => goal.id === editingGoalId.value) : undefined
  const baseGoal: BudgetyarGoal = {
    id: existing?.id ?? String(Date.now()),
    title,
    targetAmount,
    savedAmount,
    unit: goalForm.unit,
    trackingMode: goalForm.trackingMode,
    baseCurrency: goalForm.baseCurrency,
    targetQuantity: targetQuantity || undefined,
    assetCode: goalForm.assetCode.trim() || undefined,
    targetValuePolicy: goalForm.targetValuePolicy,
    inflationRate: Math.max(0, Number(goalForm.inflationRate) || 0),
    priceSource: goalForm.priceSource.trim() || undefined,
    contributionFrequency: goalForm.contributionFrequency,
    plannedContribution: Math.max(0, Number(goalForm.plannedContribution) || 0),
    reminderPolicy: goalForm.reminderPolicy,
    commitmentMode: goalForm.commitmentMode,
    coolingOffPeriod: Math.max(0, Math.trunc(Number(goalForm.coolingOffPeriod) || 0)),
    targetDate: goalForm.targetDate ? normalizeJalaliDate(goalForm.targetDate) : undefined,
    categoryId: goalForm.categoryId || undefined,
    priority: goalForm.priority,
    icon: goalForm.icon.trim() || '🎯',
    color: goalForm.color || '#22d3ee',
    note: goalForm.note.trim(),
    isArchived: existing?.isArchived ?? false,
    status: existing?.status ?? 'active',
    createdAt: existing?.createdAt ?? todayKey,
    updatedAt: todayKey,
  }
  const snapshot = calculateGoalSnapshot(baseGoal, goalTransactions.value, marketRates.value, todayKey)
  const goal: BudgetyarGoal = {
    ...baseGoal,
    targetAmount: baseGoal.trackingMode === 'ASSET_FUNDING'
      ? (snapshot.currentRequiredAmount ?? targetAmount)
      : baseGoal.trackingMode === 'ASSET_HOLDING'
        ? (targetQuantity || targetAmount)
        : targetAmount,
    savedAmount: baseGoal.trackingMode === 'ASSET_HOLDING' ? (targetQuantity || savedAmount) : savedAmount,
  }

  goals.value = existing ? goals.value.map((item) => (item.id === existing.id ? goal : item)) : [goal, ...goals.value]
  const previousSavedAmount = existing?.savedAmount ?? 0
  const delta = goal.savedAmount - previousSavedAmount
  if (!existing && savedAmount > 0) {
    goalTransactions.value = [buildGoalTransaction(goal, 'ADJUSTMENT', savedAmount, 'مقدار اولیه هدف'), ...goalTransactions.value]
  } else if (existing && delta !== 0) {
    const adjustmentType = goal.trackingMode === 'ASSET_HOLDING'
      ? (delta > 0 ? 'ASSET_PURCHASE' : 'ASSET_SALE')
      : (delta > 0 ? 'DEPOSIT' : 'WITHDRAWAL')
    goalTransactions.value = [buildGoalTransaction(goal, adjustmentType, Math.abs(delta), delta > 0 ? 'افزایش موجودی هدف' : 'کاهش موجودی هدف'), ...goalTransactions.value]
  }
  refreshGoalState(goal.id)
  resetGoalForm()
  pushToast(existing ? 'هدف ویرایش شد ✅' : 'هدف مالی اضافه شد ✅')
}

function editGoal(goal: BudgetyarGoal) {
  editingGoalId.value = goal.id
  Object.assign(goalForm, {
    title: goal.title,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    unit: goal.unit ?? 'irr',
    trackingMode: goal.trackingMode ?? 'FIXED_MONEY',
    baseCurrency: goal.baseCurrency ?? 'irr',
    targetQuantity: goal.targetQuantity ?? 0,
    assetCode: goal.assetCode ?? '',
    targetValuePolicy: goal.targetValuePolicy ?? 'NOMINAL',
    inflationRate: goal.inflationRate ?? 0,
    priceSource: goal.priceSource ?? '',
    contributionFrequency: goal.contributionFrequency ?? 'monthly',
    plannedContribution: goal.plannedContribution ?? 0,
    reminderPolicy: goal.reminderPolicy ?? 'before-due',
    commitmentMode: goal.commitmentMode ?? 'NONE',
    coolingOffPeriod: goal.coolingOffPeriod ?? 0,
    targetDate: goal.targetDate ?? '',
    categoryId: goal.categoryId ?? '',
    priority: goal.priority,
    icon: goal.icon ?? '🎯',
    color: goal.color ?? '#22d3ee',
    note: goal.note ?? '',
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateGoal(id: string, patch: Partial<BudgetyarGoal>) {
  goals.value = goals.value.map((goal) => (goal.id === id ? { ...goal, ...patch, updatedAt: todayKey } : goal))
}

function deleteGoal(id: string) {
  goals.value = goals.value.filter((goal) => goal.id !== id)
  goalTransactions.value = goalTransactions.value.filter((transaction) => transaction.goalId !== id)
  if (editingGoalId.value === id) resetGoalForm()
  pushToast('هدف حذف شد')
}

function archiveGoal(id: string) {
  const goal = goals.value.find((item) => item.id === id)
  updateGoal(id, { isArchived: !goal?.isArchived })
  pushToast(goal?.isArchived ? 'هدف فعال شد' : 'هدف بایگانی شد')
}

function pauseGoal(id: string) {
  const goal = goals.value.find((item) => item.id === id)
  if (!goal || goal.isArchived || goal.status === 'completed') return
  updateGoal(id, { status: 'paused' })
  pushToast('هدف متوقف شد')
}

function resumeGoal(id: string) {
  const goal = goals.value.find((item) => item.id === id)
  if (!goal || goal.isArchived || goal.status !== 'paused') return
  updateGoal(id, { status: 'active' })
  pushToast('هدف ادامه پیدا کرد')
}

function addGoalContribution(goal: BudgetyarGoal, amount = 0) {
  const rawAmount = amount || Number(window.prompt('مبلغ واریز به هدف') || 0)
  const value = Math.max(0, rawAmount)
  if (!value) return

  goalTransactions.value = [buildGoalTransaction(goal, goal.trackingMode === 'ASSET_HOLDING' ? 'ASSET_PURCHASE' : 'DEPOSIT', value), ...goalTransactions.value]
  refreshGoalState(goal.id)
  pushToast('پس‌انداز هدف بیشتر شد ✅')
}

function withdrawFromGoal(goal: BudgetyarGoal, amount = 0) {
  const rawAmount = amount || Number(window.prompt('مبلغ برداشت از هدف') || 0)
  const value = Math.max(0, rawAmount)
  if (!value) return
  const snapshot = getGoalSnapshot(goal)
  const available = goal.trackingMode === 'ASSET_HOLDING' ? snapshot.currentQuantity : snapshot.netSavedAmount
  if (value > available) {
    pushToast('برداشت بیشتر از موجودی هدف ممکن نیست')
    return
  }

  goalTransactions.value = [buildGoalTransaction(goal, goal.trackingMode === 'ASSET_HOLDING' ? 'ASSET_SALE' : 'WITHDRAWAL', value), ...goalTransactions.value]
  refreshGoalState(goal.id)
  pushToast('برداشت از هدف ثبت شد')
}

function getGoalProgress(goal: BudgetyarGoal) {
  return getGoalSnapshot(goal).progressPercent
}

function getGoalUnitLabel(unit: GoalUnit = 'irr') {
  return unit === 'goldGram' ? 'گرم طلا' : unit === 'silverGram' ? 'گرم نقره' : unit === 'usd' ? 'دلار' : 'تومان'
}

function getGoalTransactionTypeLabel(type: BudgetyarGoalTransaction['type']) {
  const labels: Record<BudgetyarGoalTransaction['type'], string> = {
    DEPOSIT: 'واریز',
    WITHDRAWAL: 'برداشت',
    TRANSFER_IN: 'انتقال به هدف',
    TRANSFER_OUT: 'انتقال از هدف',
    ADJUSTMENT: 'اصلاح موجودی',
    ASSET_PURCHASE: 'خرید دارایی',
    ASSET_SALE: 'فروش دارایی',
  }
  return labels[type] ?? type
}

function formatGoalAmount(amount: number, unit: GoalUnit = 'irr') {
  return unit === 'irr' ? formatMoney(amount) : `${toPersianNumber(amount)} ${getGoalUnitLabel(unit)}`
}

function getGoalEstimatedValue(goal: BudgetyarGoal, amount = goal.savedAmount) {
  const snapshot = getGoalSnapshot(goal)
  if (goal.trackingMode === 'ASSET_HOLDING') {
    if (snapshot.currentMarketPrice === null) return null
    const quantity = amount === goal.targetAmount ? (goal.targetQuantity ?? goal.targetAmount) : snapshot.currentQuantity
    return Math.round(quantity * snapshot.currentMarketPrice)
  }
  if (goal.trackingMode === 'ASSET_FUNDING') {
    if (amount === goal.targetAmount) return snapshot.currentRequiredAmount ?? null
    return snapshot.netSavedAmount
  }
  if (goal.unit === 'usd' && marketRates.value?.usd) return Math.round(amount * marketRates.value.usd)
  if (goal.unit === 'goldGram' && marketRates.value?.gold18) return Math.round(amount * marketRates.value.gold18)
  if (goal.unit === 'irr') return amount
  return null
}

function getGoalRemainingAmount(goal: BudgetyarGoal) {
  return getGoalSnapshot(goal).remainingAmount
}

function getGoalSuggestedMonthlySaving(goal: BudgetyarGoal) {
  return getGoalSnapshot(goal).monthlyNeeded
}

function getGoalSuggestedWeeklySaving(goal: BudgetyarGoal) {
  return getGoalSnapshot(goal).weeklyNeeded
}

function getGoalTrackingModeLabel(goal: BudgetyarGoal) {
  return formatGoalModeLabel(goal.trackingMode ?? 'FIXED_MONEY')
}

function getGoalHealthLabel(goal: BudgetyarGoal) {
  return formatGoalHealthLabel(getGoalSnapshot(goal).healthLevel)
}

function getGoalScenario(goal: BudgetyarGoal) {
  return calculateGoalScenario(goal, goalTransactions.value, marketRates.value, todayKey)
}

function getGoalTransactions(goalId: string) {
  return goalTransactions.value.filter((transaction) => transaction.goalId === goalId).slice(0, 8)
}

async function refreshMarketRates() {
  if (marketRatesLoading.value) return
  const config = useRuntimeConfig()
  if (!config.public.brsApiKey) {
    marketRatesError.value = 'کلید API در تنظیمات محیطی ثبت نشده است.'
    return
  }
  marketRatesLoading.value = true
  marketRatesError.value = ''
  try {
    const response = await $fetch<any>(`https://api.brsapi.ir/Market/Gold_Currency.php?key=${encodeURIComponent(config.public.brsApiKey)}`)
    const rows = Array.isArray(response)
      ? response
      : [
          ...(Array.isArray(response.gold) ? response.gold : []),
          ...(Array.isArray(response.currency) ? response.currency : []),
          ...(Array.isArray(response.data) ? response.data : []),
          ...(Array.isArray(response.result) ? response.result : []),
        ]
    const find = (symbols: string[]) => Number(rows.find((item: any) => symbols.includes(String(item.symbol).toUpperCase()))?.price ?? 0)
    marketRates.value = { usd: find(['USD', 'IR_USD']), gold18: find(['IR_GOLD_18K', 'GOLD_18K', 'IR_GOLD_18']), updatedAt: new Date().toISOString() }
    localStorage.setItem('budgetyar-market-rates-v1', JSON.stringify(marketRates.value))
  } catch {
    marketRatesError.value = 'دریافت قیمت‌ها انجام نشد؛ آخرین نرخ ذخیره‌شده را بررسی کن.'
  } finally {
    marketRatesLoading.value = false
  }
}

function resetRecurringForm() {
  editingRecurringItemId.value = null
  Object.assign(recurringForm, {
    title: '',
    type: 'expense',
    amount: 0,
    categoryId: 'other',
    frequency: 'monthly',
    startDate: todayKey,
    endDate: '',
    dueDay: currentJalaliDate.day,
    paymentMethod: 'cash',
    isSubscription: false,
    isActive: true,
    reminderDaysBefore: 3,
    note: '',
  })
}

function addRecurringItem() {
  const title = recurringForm.title.trim()
  const amount = Math.max(0, Number(recurringForm.amount) || 0)
  if (!title || !amount || !recurringForm.startDate) return

  const existing = editingRecurringItemId.value ? recurringItems.value.find((item) => item.id === editingRecurringItemId.value) : undefined
  const item: BudgetyarRecurringItem = {
    id: existing?.id ?? String(Date.now()),
    title,
    type: recurringForm.type,
    amount,
    categoryId: recurringForm.type === 'expense' ? recurringForm.categoryId : undefined,
    frequency: recurringForm.frequency,
    startDate: normalizeJalaliDate(recurringForm.startDate),
    endDate: recurringForm.endDate ? normalizeJalaliDate(recurringForm.endDate) : undefined,
    dueDay: recurringForm.frequency === 'monthly' ? Math.min(31, Math.max(1, Math.trunc(Number(recurringForm.dueDay) || 1))) : undefined,
    paymentMethod: recurringForm.type === 'expense' ? recurringForm.paymentMethod : undefined,
    isSubscription: Boolean(recurringForm.isSubscription),
    isActive: Boolean(recurringForm.isActive),
    reminderDaysBefore: Math.max(0, Math.trunc(Number(recurringForm.reminderDaysBefore) || 0)),
    lastAppliedDate: existing?.lastAppliedDate,
    skippedDates: existing?.skippedDates ?? [],
    note: recurringForm.note.trim(),
    createdAt: existing?.createdAt ?? todayKey,
    updatedAt: todayKey,
  }

  recurringItems.value = existing ? recurringItems.value.map((entry) => (entry.id === existing.id ? item : entry)) : [item, ...recurringItems.value]
  resetRecurringForm()
  pushToast(existing ? 'پرداخت تکراری ویرایش شد ✅' : 'پرداخت تکراری اضافه شد ✅')
}

function editRecurringItem(item: BudgetyarRecurringItem) {
  editingRecurringItemId.value = item.id
  Object.assign(recurringForm, {
    title: item.title,
    type: item.type,
    amount: item.amount,
    categoryId: item.categoryId ?? 'other',
    frequency: item.frequency,
    startDate: item.startDate,
    endDate: item.endDate ?? '',
    dueDay: item.dueDay ?? currentJalaliDate.day,
    paymentMethod: item.paymentMethod ?? 'cash',
    isSubscription: item.isSubscription,
    isActive: item.isActive,
    reminderDaysBefore: item.reminderDaysBefore,
    note: item.note ?? '',
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateRecurringItem(id: string, patch: Partial<BudgetyarRecurringItem>) {
  recurringItems.value = recurringItems.value.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: todayKey } : item))
}

function deleteRecurringItem(id: string) {
  recurringItems.value = recurringItems.value.filter((item) => item.id !== id)
  if (editingRecurringItemId.value === id) resetRecurringForm()
  pushToast('آیتم تکراری حذف شد')
}

function toggleRecurringItem(id: string) {
  const item = recurringItems.value.find((entry) => entry.id === id)
  if (item) updateRecurringItem(id, { isActive: !item.isActive })
}

function getRecurringNextDueDate(item: BudgetyarRecurringItem) {
  if (!item.isActive) return ''

  let cursor = getPlanningRecurringNextDueDate({ ...item, lastAppliedDate: undefined }, item.startDate)

  for (let guard = 0; guard < 240 && cursor; guard += 1) {
    if (item.endDate && cursor > item.endDate) return ''
    const isHandled = item.lastAppliedDate === cursor || item.skippedDates?.includes(cursor)
    if (!isHandled && cursor <= todayKey) return cursor
    if (cursor > todayKey) return cursor
    cursor = getNextRecurringDateAfter(item, cursor)
  }

  return ''
}

function markRecurringItemPaid(item: BudgetyarRecurringItem, dueDate = getRecurringNextDueDate(item)) {
  if (!dueDate || transactions.value.some((transaction) => transaction.sourceType === 'recurring' && transaction.sourceId === item.id && transaction.sourceDate === dueDate)) {
    pushToast('این نوبت قبلا ثبت شده است')
    return
  }

  transactions.value = [createTransactionFromRecurringItem(item, dueDate), ...transactions.value]
  updateRecurringItem(item.id, { lastAppliedDate: dueDate })
  pushToast('نوبت تکراری به تراکنش تبدیل شد ✅')
}

function skipRecurringOccurrence(item: BudgetyarRecurringItem, dueDate = getRecurringNextDueDate(item)) {
  if (!dueDate) return

  updateRecurringItem(item.id, { skippedDates: [...new Set([...(item.skippedDates ?? []), dueDate])] })
  pushToast('این نوبت رد شد')
}

function createTransactionFromRecurringItem(item: BudgetyarRecurringItem, dueDate = getRecurringNextDueDate(item)): Transaction {
  return {
    id: Date.now(),
    type: item.type,
    title: item.title,
    amount: item.amount,
    date: dueDate || todayKey,
    category: item.type === 'expense' ? item.categoryId ?? 'other' : undefined,
    description: item.note,
    paymentMethod: item.type === 'expense' ? item.paymentMethod ?? 'cash' : undefined,
    isEssential: item.type === 'expense' ? true : undefined,
    isLoan: item.type === 'expense' ? false : undefined,
    sourceType: 'recurring',
    sourceId: item.id,
    sourceDate: dueDate || todayKey,
  }
}

function getRecurringStatus(item: BudgetyarRecurringItem) {
  const nextDue = getRecurringNextDueDate(item)
  if (!item.isActive) return 'inactive'
  if (!nextDue) return 'done'
  if (nextDue < todayKey) return 'overdue'
  if (nextDue === todayKey) return 'due'
  if (getJalaliDateDistance(todayKey, nextDue) <= item.reminderDaysBefore) return 'upcoming'

  return 'active'
}

function getRecurringStatusLabel(status: string) {
  const labels: Record<string, string> = {
    inactive: 'غیرفعال',
    done: 'تمام‌شده',
    overdue: 'عقب‌افتاده',
    due: 'امروز',
    upcoming: 'نزدیک',
    active: 'فعال',
  }

  return labels[status] ?? 'فعال'
}

function getMonthlyRecurringAmount(item: BudgetyarRecurringItem) {
  if (item.frequency === 'daily') return item.amount * 30
  if (item.frequency === 'weekly') return item.amount * 4
  if (item.frequency === 'yearly') return Math.round(item.amount / 12)

  return item.amount
}

function getForecastDayCount() {
  if (cashflowForecastPeriod.value === 'next30Days') return 30
  if (cashflowForecastPeriod.value === 'next90Days') return 90

  return Math.max(1, getJalaliDateDistance(todayKey, currentMonthEndKey) + 1)
}

function getCashflowEvents() {
  const events: Array<{ date: string; amount: number; kind: 'income' | 'expense'; source?: 'recurring' | 'installment' | 'budget' }> = []
  const endDate = formatJalaliInputDate(addJalaliDays(currentJalaliDate, getForecastDayCount() - 1))

  activeInstallmentSummaries.value.forEach((item) => {
    if (item.nextDueDate >= todayKey && item.nextDueDate <= endDate) {
      events.push({ date: item.nextDueDate, amount: item.amount, kind: 'expense', source: 'installment' })
    }
  })

  activeRecurringItems.value.forEach((item) => {
    getRecurringOccurrences(item, todayKey, endDate).forEach((date) => {
      events.push({ date, amount: item.amount, kind: item.type, source: 'recurring' })
    })
  })

  const remainingBudget = Math.max(totalBudget.value - totalExpense.value, 0)
  const dailyPlannedExpense = Math.floor(remainingBudget / Math.max(getForecastDayCount(), 1))
  if (dailyPlannedExpense > 0) {
    for (let index = 0; index < getForecastDayCount(); index += 1) {
      events.push({
        date: formatJalaliInputDate(addJalaliDays(currentJalaliDate, index)),
        amount: dailyPlannedExpense,
        kind: 'expense',
        source: 'budget',
      })
    }
  }

  return events
}

function getRecurringOccurrences(item: BudgetyarRecurringItem, startDate: string, endDate: string) {
  const occurrences: string[] = []
  let cursor = getPlanningRecurringNextDueDate({ ...item, lastAppliedDate: undefined }, startDate)

  for (let guard = 0; guard < 150 && cursor && cursor <= endDate; guard += 1) {
    if ((!item.endDate || cursor <= item.endDate) && !item.skippedDates?.includes(cursor)) occurrences.push(cursor)
    cursor = getNextRecurringDateAfter(item, cursor)
  }

  return occurrences
}

function getNextRecurringDateAfter(item: BudgetyarRecurringItem, date: string) {
  const parsed = parseJalaliInput(date)
  if (!parsed) return ''
  if (item.frequency === 'daily') return formatJalaliInputDate(addJalaliDays(parsed, 1))
  if (item.frequency === 'weekly') return formatJalaliInputDate(addJalaliDays(parsed, 7))
  if (item.frequency === 'yearly') {
    const nextYear = parsed.year + 1
    return formatJalaliInputDate({ year: nextYear, month: parsed.month, day: Math.min(parsed.day, getJalaliMonthLength(nextYear, parsed.month)) })
  }

  const nextMonth = addJalaliMonths(parsed, 1)
  return formatJalaliInputDate({ ...nextMonth, day: Math.min(item.dueDay ?? parsed.day, getJalaliMonthLength(nextMonth.year, nextMonth.month)) })
}

function getJalaliDateDistance(startDate: string, endDate: string) {
  const start = parseJalaliInput(startDate)
  const end = parseJalaliInput(endDate)
  if (!start || !end) return 0

  const startIso = toGregorian(start.year, start.month, start.day)
  const endIso = toGregorian(end.year, end.month, end.day)

  return Math.ceil((Date.parse(`${endIso}T00:00:00.000Z`) - Date.parse(`${startIso}T00:00:00.000Z`)) / 86400000)
}

function buildPurchaseDecision() {
  const category = categoryTotals.value.find((item) => item.key === purchaseForm.categoryId)
  const weeklyCategory = weeklyCategoryBudgets.value.find((item) => item.key === purchaseForm.categoryId)
  const amount = Math.max(0, Number(purchaseForm.amount) || 0)
  const categoryBudget = category?.budget ?? 0
  const categorySpent = category?.spent ?? 0
  const weeklyBudget = weeklyCategory?.weeklyBudget ?? weeklyBudgetAllowance.value
  const weeklySpent = weeklyExpenseTransactions.value.filter((item) => item.category === purchaseForm.categoryId).reduce((sum, item) => sum + item.amount, 0)
  const beforeBalance = projectedEndOfMonthBalance.value
  const decision = getPurchaseDecision({
    amount,
    categoryBudget,
    categorySpent,
    weeklyBudget,
    weeklySpent,
    projectedBalance: beforeBalance,
    safeDailySpend: safeDailySpend.value,
    creditLimit: creditLimit.value,
    creditUsed: creditExpense.value,
    paymentMethod: purchaseForm.paymentMethod,
    isEssential: purchaseForm.isEssential,
    nonEssentialSpending: nonEssentialExpense.value,
    highPriorityGoalRemaining: activeGoals.value.filter((goal) => goal.priority === 'high').reduce((sum, goal) => sum + getGoalRemainingAmount(goal), 0),
    hasNearDueObligation: upcomingInstallments.value.length > 0 || upcomingRecurringItems.value.length > 0 || dueRecurringItems.value.length > 0,
  })
  const afterBalance = beforeBalance - (purchaseForm.paymentMethod === 'cash' ? amount : 0)

  return {
    ...decision,
    title: decision.level === 'safe' ? 'امن' : decision.level === 'caution' ? 'با احتیاط' : 'پرریسک',
    summary: getPurchaseDecisionSummary(decision.level),
    budgetImpact: {
      categoryBudget,
      categorySpent,
      categoryRemainingBefore: Math.max(categoryBudget - categorySpent, 0),
      categoryRemainingAfter: Math.max(categoryBudget - categorySpent - amount, 0),
      monthlyBudgetImpactPercent: Math.round((amount / Math.max(totalBudget.value, 1)) * 100),
      weeklyBudgetImpactPercent: Math.round((amount / Math.max(weeklyBudget, 1)) * 100),
    },
    cashflowImpact: {
      projectedBalanceBefore: beforeBalance,
      projectedBalanceAfter: afterBalance,
      safeDailySpendBefore: safeDailySpend.value,
      safeDailySpendAfter: Math.max(0, Math.floor(afterBalance / Math.max(cashflowForecastDays.value.length, 1))),
    },
    creditImpact: purchaseForm.paymentMethod === 'credit'
      ? {
          creditLimit: creditLimit.value,
          creditUsedBefore: creditExpense.value,
          creditUsedAfter: creditExpense.value + amount,
          creditRemainingAfter: Math.max(creditLimit.value - creditExpense.value - amount, 0),
        }
      : undefined,
    goalImpact: {
      delayedGoals: activeGoals.value
        .filter((goal) => goal.priority === 'high' && amount > getGoalSuggestedWeeklySaving(goal))
        .slice(0, 3)
        .map((goal) => ({
          goalId: goal.id,
          title: goal.title,
          estimatedDelayDays: Math.ceil(amount / Math.max(getGoalSuggestedWeeklySaving(goal), 1)) * 7,
        })),
    },
    suggestions: getPurchaseSuggestionTexts(decision.suggestions),
  }
}

function getPurchaseDecisionSummary(level: PurchaseDecisionResult['level']) {
  if (level === 'safe') return 'این خرید امن به نظر می‌رسد.'
  if (level === 'caution') return 'این خرید قابل انجام است، اما فشار بودجه‌ای ایجاد می‌کند.'

  return 'این خرید فعلا پرریسک است.'
}

function getPurchaseSuggestionTexts(suggestions: string[]) {
  const labels: Record<string, string> = {
    'reduce-amount': 'مبلغ را کاهش بده.',
    'delay-purchase': 'خرید را چند روز عقب بینداز.',
    'protect-cashflow': 'قبل از خرید، مانده نقدی پایان ماه را بررسی کن.',
    'prefer-cash': 'بهتر است با پول نقد بخری نه اعتبار.',
    'wait-72-hours': 'اگر ضروری نیست ۷۲ ساعت صبر کن.',
    'protect-goals': 'برای هدف‌های مهم، مبلغی را دست‌نخورده نگه دار.',
    'check-due-payments': 'سررسیدهای نزدیک را قبل از خرید پرداخت کن.',
  }

  return suggestions.map((item) => labels[item]).filter(Boolean)
}

function createPurchaseTransaction() {
  if (!purchaseForm.amount) return

  transactions.value = [{
    id: Date.now(),
    type: 'expense',
    title: purchaseForm.note.trim() || 'خرید برنامه‌ریزی‌شده',
    amount: Math.max(0, Number(purchaseForm.amount) || 0),
    date: normalizeJalaliDate(purchaseForm.date),
    category: purchaseForm.categoryId,
    description: purchaseForm.note,
    paymentMethod: purchaseForm.paymentMethod,
    isEssential: purchaseForm.isEssential,
    isLoan: false,
    sourceType: 'manual',
  }, ...transactions.value]
  Object.assign(purchaseForm, { amount: 0, categoryId: 'other', date: todayKey, isEssential: false, paymentMethod: 'cash', note: '' })
  pushToast('خرید به تراکنش تبدیل شد ✅')
}

function resetDebtForm() {
  editingDebtId.value = null
  Object.assign(debtForm, {
    title: '',
    type: 'loan',
    principalAmount: 0,
    remainingAmount: 0,
    interestRateAnnual: 0,
    minimumMonthlyPayment: 0,
    extraMonthlyPayment: 0,
    dueDay: currentJalaliDate.day,
    startDate: todayKey,
    targetPayoffDate: '',
    linkedInstallmentId: '',
    creditorName: '',
    priority: 'medium',
    isActive: true,
    note: '',
  })
}

function addDebt() {
  const title = debtForm.title.trim()
  const remainingAmount = Math.max(0, Number(debtForm.remainingAmount) || 0)
  if (!title || !remainingAmount) return

  const existing = editingDebtId.value ? debts.value.find((debt) => debt.id === editingDebtId.value) : undefined
  const debt: BudgetyarDebt = {
    id: existing?.id ?? String(Date.now()),
    title,
    type: debtForm.type,
    principalAmount: Math.max(remainingAmount, Number(debtForm.principalAmount) || remainingAmount),
    remainingAmount,
    interestRateAnnual: Math.max(0, Number(debtForm.interestRateAnnual) || 0),
    minimumMonthlyPayment: Math.max(0, Number(debtForm.minimumMonthlyPayment) || 0),
    extraMonthlyPayment: Math.max(0, Number(debtForm.extraMonthlyPayment) || 0),
    dueDay: Math.min(31, Math.max(1, Math.trunc(Number(debtForm.dueDay) || 1))),
    startDate: debtForm.startDate ? normalizeJalaliDate(debtForm.startDate) : undefined,
    targetPayoffDate: debtForm.targetPayoffDate ? normalizeJalaliDate(debtForm.targetPayoffDate) : undefined,
    linkedInstallmentId: debtForm.linkedInstallmentId || undefined,
    creditorName: debtForm.creditorName.trim(),
    priority: debtForm.priority,
    isActive: Boolean(debtForm.isActive),
    note: debtForm.note.trim(),
    createdAt: existing?.createdAt ?? todayKey,
    updatedAt: todayKey,
  }

  debts.value = existing ? debts.value.map((item) => (item.id === existing.id ? debt : item)) : [debt, ...debts.value]
  resetDebtForm()
  pushToast(existing ? 'بدهی ویرایش شد ✅' : 'بدهی اضافه شد ✅')
}

function editDebt(debt: BudgetyarDebt) {
  editingDebtId.value = debt.id
  Object.assign(debtForm, {
    title: debt.title,
    type: debt.type,
    principalAmount: debt.principalAmount,
    remainingAmount: debt.remainingAmount,
    interestRateAnnual: debt.interestRateAnnual ?? 0,
    minimumMonthlyPayment: debt.minimumMonthlyPayment,
    extraMonthlyPayment: debt.extraMonthlyPayment ?? 0,
    dueDay: debt.dueDay ?? currentJalaliDate.day,
    startDate: debt.startDate ?? todayKey,
    targetPayoffDate: debt.targetPayoffDate ?? '',
    linkedInstallmentId: debt.linkedInstallmentId ?? '',
    creditorName: debt.creditorName ?? '',
    priority: debt.priority,
    isActive: debt.isActive,
    note: debt.note ?? '',
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateDebt(id: string, patch: Partial<BudgetyarDebt>) {
  debts.value = debts.value.map((debt) => (debt.id === id ? { ...debt, ...patch, updatedAt: todayKey } : debt))
}

function deleteDebt(id: string) {
  debts.value = debts.value.filter((debt) => debt.id !== id)
  if (editingDebtId.value === id) resetDebtForm()
  pushToast('بدهی حذف شد')
}

function toggleDebt(id: string) {
  const debt = debts.value.find((item) => item.id === id)
  if (debt) updateDebt(id, { isActive: !debt.isActive })
}

function recordDebtPayment(debt: BudgetyarDebt, amount = 0) {
  const rawAmount = amount || Number(window.prompt('مبلغ پرداخت بدهی') || 0)
  const value = Math.max(0, rawAmount)
  if (!value) return

  updateDebt(debt.id, { remainingAmount: Math.max(0, debt.remainingAmount - value) })
  transactions.value = [{
    id: Date.now(),
    type: 'expense',
    title: `پرداخت بدهی: ${debt.title}`,
    amount: value,
    date: todayKey,
    category: 'other',
    description: debt.note,
    paymentMethod: 'cash',
    isEssential: true,
    isLoan: false,
    sourceType: 'manual',
    sourceId: debt.id,
    sourceDate: todayKey,
  }, ...transactions.value]
  pushToast('پرداخت بدهی ثبت شد ✅')
}

function calculateDebtPayoffPlan(strategy: DebtPayoffStrategy): DebtPayoffPlan {
  return calculateAdvancedDebtPayoffPlan(activeDebts.value, strategy)
}

function resetCategorizationRuleForm() {
  editingCategorizationRuleId.value = null
  Object.assign(categorizationRuleForm, {
    title: '',
    isActive: true,
    matchType: 'contains',
    pattern: '',
    minAmount: 0,
    maxAmount: 0,
    merchantName: '',
    categoryId: 'other',
    transactionType: '',
    paymentMethod: '',
    priority: 10,
    applyToExisting: false,
  })
}

function addCategorizationRule() {
  const title = categorizationRuleForm.title.trim()
  if (!title) return

  const existing = editingCategorizationRuleId.value ? categorizationRules.value.find((rule) => rule.id === editingCategorizationRuleId.value) : undefined
  const rule: BudgetyarCategorizationRule = {
    id: existing?.id ?? String(Date.now()),
    title,
    isActive: Boolean(categorizationRuleForm.isActive),
    matchType: categorizationRuleForm.matchType,
    pattern: categorizationRuleForm.pattern.trim(),
    minAmount: Math.max(0, Number(categorizationRuleForm.minAmount) || 0),
    maxAmount: Math.max(0, Number(categorizationRuleForm.maxAmount) || 0),
    merchantName: categorizationRuleForm.merchantName.trim(),
    categoryId: categorizationRuleForm.categoryId,
    transactionType: categorizationRuleForm.transactionType || undefined,
    paymentMethod: categorizationRuleForm.paymentMethod || undefined,
    priority: Math.max(1, Math.trunc(Number(categorizationRuleForm.priority) || 10)),
    applyToExisting: Boolean(categorizationRuleForm.applyToExisting),
    createdAt: existing?.createdAt ?? todayKey,
    updatedAt: todayKey,
  }

  categorizationRules.value = existing ? categorizationRules.value.map((item) => (item.id === existing.id ? rule : item)) : [rule, ...categorizationRules.value]
  if (rule.applyToExisting) applyCategorizationRulesToAllTransactions()
  resetCategorizationRuleForm()
  pushToast(existing ? 'قانون ویرایش شد ✅' : 'قانون دسته‌بندی اضافه شد ✅')
}

function editCategorizationRule(rule: BudgetyarCategorizationRule) {
  editingCategorizationRuleId.value = rule.id
  Object.assign(categorizationRuleForm, {
    title: rule.title,
    isActive: rule.isActive,
    matchType: rule.matchType,
    pattern: rule.pattern ?? '',
    minAmount: rule.minAmount ?? 0,
    maxAmount: rule.maxAmount ?? 0,
    merchantName: rule.merchantName ?? '',
    categoryId: rule.categoryId,
    transactionType: rule.transactionType ?? '',
    paymentMethod: rule.paymentMethod ?? '',
    priority: rule.priority,
    applyToExisting: rule.applyToExisting,
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateCategorizationRule(id: string, patch: Partial<BudgetyarCategorizationRule>) {
  categorizationRules.value = categorizationRules.value.map((rule) => (rule.id === id ? { ...rule, ...patch, updatedAt: todayKey } : rule))
}

function deleteCategorizationRule(id: string) {
  if (id.startsWith('preset-')) {
    const deletedIds = new Set<string>()
    try {
      const savedDeletedIds = JSON.parse(localStorage.getItem(DELETED_DEFAULT_CATEGORIZATION_RULES_STORAGE_KEY) ?? '[]')
      if (Array.isArray(savedDeletedIds)) savedDeletedIds.filter((item): item is string => typeof item === 'string').forEach((item) => deletedIds.add(item))
    } catch {
      // Ignore malformed deletion history and replace it with a valid list.
    }
    deletedIds.add(id)
    localStorage.setItem(DELETED_DEFAULT_CATEGORIZATION_RULES_STORAGE_KEY, JSON.stringify([...deletedIds]))
  }
  categorizationRules.value = categorizationRules.value.filter((rule) => rule.id !== id)
  if (editingCategorizationRuleId.value === id) resetCategorizationRuleForm()
  pushToast('قانون حذف شد')
}

function toggleCategorizationRule(id: string) {
  const rule = categorizationRules.value.find((item) => item.id === id)
  if (rule) updateCategorizationRule(id, { isActive: !rule.isActive })
}

function matchTransactionCategoryRule(transaction: Transaction) {
  return activeCategorizationRules.value.find((rule) => matchCategorizationRule(rule, transaction))
}

function applyCategorizationRulesToTransaction(transaction: Transaction): Transaction {
  const rule = matchTransactionCategoryRule(transaction)
  if (!rule || transaction.type !== 'expense') return transaction

  return {
    ...transaction,
    category: rule.categoryId,
    autoCategorized: true,
    categorizationRuleId: rule.id,
    merchantName: transaction.merchantName ?? rule.merchantName,
  }
}

function applyCategorizationRulesToAllTransactions() {
  let changedCount = 0
  transactions.value = transactions.value.map((transaction) => {
    const updated = applyCategorizationRulesToTransaction(transaction)
    if (updated !== transaction) changedCount += 1
    return updated
  })
  pushToast(`${toPersianNumber(changedCount)} تراکنش به‌روزرسانی شد`)
}

function suggestCategorizationRules() {
  const groups = new Map<string, { title: string; categoryId: string; count: number }>()
  transactions.value
    .filter((transaction) => transaction.type === 'expense' && transaction.category)
    .forEach((transaction) => {
      const token = transaction.merchantName || transaction.title.trim().split(/\s+/)[0]
      if (!token || token.length < 3) return
      const key = `${token}-${transaction.category}`
      const current = groups.get(key) ?? { title: token, categoryId: transaction.category ?? 'other', count: 0 }
      current.count += 1
      groups.set(key, current)
    })

  return [...groups.values()]
    .filter((item) => item.count >= 3 && !categorizationRules.value.some((rule) => rule.pattern === item.title || rule.merchantName === item.title))
    .slice(0, 5)
}

function acceptSuggestedCategorizationRule(suggestion: { title: string; categoryId: string }) {
  categorizationRules.value = [{
    id: String(Date.now()),
    title: `قانون ${suggestion.title}`,
    isActive: true,
    matchType: 'contains',
    pattern: suggestion.title,
    categoryId: suggestion.categoryId,
    priority: 10,
    applyToExisting: false,
    createdAt: todayKey,
    updatedAt: todayKey,
  }, ...categorizationRules.value]
  pushToast('پیشنهاد قانون پذیرفته شد ✅')
}

function bulkUpdateTransactionCategory(ids: number[], categoryId: string) {
  transactions.value = transactions.value.map((transaction) => (ids.includes(transaction.id) ? { ...transaction, category: categoryId } : transaction))
}

function updateIncomeSettings(patch: Partial<BudgetyarIncomeSettings>) {
  incomeSettings.value = { ...incomeSettings.value, ...patch, updatedAt: todayKey }
}

function applyRecommendedBudgetPlan() {
  if (!window.confirm('بودجه‌های اصلی بر اساس پیشنهاد درآمد نامنظم به‌روزرسانی شوند؟')) return
  const essentialKeys = ['food', 'transport', 'rent', 'bills', 'health', 'education']
  const flexibleKeys = categories.value.filter((category) => !essentialKeys.includes(category.key)).map((category) => category.key)
  const essentialShare = Math.round(recommendedEssentialBudget.value / Math.max(essentialKeys.length, 1))
  const flexibleShare = Math.round(recommendedFlexibleBudget.value / Math.max(flexibleKeys.length, 1))

  budgets.value = categories.value.map((category) => ({
    category: category.key,
    budget: essentialKeys.includes(category.key) ? essentialShare : flexibleShare,
  }))
  pushToast('بودجه پیشنهادی اعمال شد ✅')
}

function getRecentMonthlyIncome(count: 3 | 6 | 12) {
  return Array.from({ length: count }, (_, index) => {
    const date = addJalaliMonths(currentJalaliDate, -index)
    const prefix = getJalaliMonthPrefix(date)
    return transactions.value
      .filter((transaction) => transaction.type === 'income' && normalizeJalaliDate(transaction.date).startsWith(prefix))
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  })
}

function getIncomeWarningLabel(key: string) {
  if (key === 'budget-percent-total') return 'جمع درصدهای ضروری، پس‌انداز و منعطف باید ۱۰۰ باشد.'
  if (key === 'high-income-volatility') return 'نوسان درآمد بالاست؛ بودجه محافظه‌کارانه امن‌تر است.'

  return key
}

function getFinancialHealthLevelLabel(level: FinancialHealthLevel) {
  if (level === 'excellent') return 'عالی'
  if (level === 'good') return 'خوب'
  if (level === 'watch') return 'نیاز به توجه'

  return 'پرخطر'
}

function getExportDateStamp() {
  return new Date().toISOString().slice(0, 10)
}

function escapeCsvCell(value: string | number | undefined) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function getSortedTransactions() {
  return [...transactions.value].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

function getTransactionCategoryLabel(item: Transaction) {
  return item.type === 'income' ? 'درآمد' : getCategory(item.category ?? 'other').label
}

function getPaymentMethodLabel(item: Transaction) {
  if (item.type === 'income') return '-'

  return item.paymentMethod === 'credit' ? 'اعتباری' : 'نقدی'
}

function getRiskLabel(level: CashflowRiskLevel) {
  if (level === 'safe') return 'امن'
  if (level === 'watch') return 'نیاز به توجه'

  return 'پرریسک'
}

function getNecessityLabel(item: Transaction) {
  if (item.type === 'income') return '-'

  return item.isEssential === false ? 'غیرضروری' : 'ضروری'
}

function buildCsvReport() {
  const headers = ['نوع', 'عنوان', 'دسته', 'تاریخ', 'مبلغ', 'روش پرداخت', 'ضرورت', 'قرض به', 'توضیحات']
  const rows = getSortedTransactions().map((item) => [
    item.type === 'income' ? 'درآمد' : 'هزینه',
    item.title,
    getTransactionCategoryLabel(item),
    item.date,
    item.amount,
    getPaymentMethodLabel(item),
    getNecessityLabel(item),
    item.loanPerson ?? '',
    item.description ?? '',
  ])
  const installmentHeaders = ['عنوان قسط', 'دسته', 'مبلغ هر قسط', 'سررسید بعدی', 'پرداخت شده', 'کل اقساط', 'وضعیت', 'روش پرداخت', 'توضیحات']
  const installmentRows = installmentSummaries.value.map((item) => [
    item.title,
    getCategory(item.category).label,
    item.amount,
    item.nextDueDate || '-',
    item.paidCount,
    item.totalCount,
    item.statusLabel,
    item.paymentMethod === 'credit' ? 'اعتباری' : 'نقدی',
    item.description ?? '',
  ])

  return `\uFEFF${[
    ['تراکنش‌ها'],
    headers,
    ...rows,
    [],
    ['قسط‌ها'],
    installmentHeaders,
    ...installmentRows,
  ].map((row) => row.map(escapeCsvCell).join(',')).join('\n')}`
}

function buildExcelReport() {
  const rows = getSortedTransactions().map((item) => `
    <tr>
      <td>${item.type === 'income' ? 'درآمد' : 'هزینه'}</td>
      <td>${item.title}</td>
      <td>${getTransactionCategoryLabel(item)}</td>
      <td>${item.date}</td>
      <td>${item.amount}</td>
      <td>${getPaymentMethodLabel(item)}</td>
      <td>${getNecessityLabel(item)}</td>
      <td>${item.loanPerson ?? ''}</td>
      <td>${item.description ?? ''}</td>
    </tr>
  `).join('')
  const installmentRows = installmentSummaries.value.map((item) => `
    <tr>
      <td>${item.title}</td>
      <td>${getCategory(item.category).label}</td>
      <td>${item.amount}</td>
      <td>${item.nextDueDate || '-'}</td>
      <td>${item.paidCount}</td>
      <td>${item.totalCount}</td>
      <td>${item.statusLabel}</td>
      <td>${item.paymentMethod === 'credit' ? 'اعتباری' : 'نقدی'}</td>
      <td>${item.description ?? ''}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Tahoma, sans-serif; direction: rtl; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d7dde8; padding: 8px; text-align: right; }
    th { background: #eef4ff; }
  </style>
</head>
<body>
  <h1>گزارش پولدار</h1>
  <p>درآمد ماه: ${formatMoney(totalIncome.value)}</p>
  <p>هزینه ماه: ${formatMoney(totalExpense.value)}</p>
  <p>پرداخت اعتبار آخر ماه: ${formatMoney(creditExpense.value)}</p>
  <p>قسط‌های سررسید تا پایان ماه: ${formatMoney(commitmentInstallmentDue.value)}</p>
  <p>خرج ضروری: ${formatMoney(essentialExpense.value)}</p>
  <p>خرج غیرضروری: ${formatMoney(nonEssentialExpense.value)}</p>
  <p>مانده بعد از تعهدات: ${formatMoney(balanceAfterCommitments.value)}</p>
  <h2>تراکنش‌ها</h2>
  <table>
    <thead>
      <tr><th>نوع</th><th>عنوان</th><th>دسته</th><th>تاریخ</th><th>مبلغ</th><th>روش پرداخت</th><th>ضرورت</th><th>قرض به</th><th>توضیحات</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>قسط‌ها</h2>
  <table>
    <thead>
      <tr><th>عنوان</th><th>دسته</th><th>مبلغ هر قسط</th><th>سررسید بعدی</th><th>پرداخت شده</th><th>کل اقساط</th><th>وضعیت</th><th>روش پرداخت</th><th>توضیحات</th></tr>
    </thead>
    <tbody>${installmentRows}</tbody>
  </table>
</body>
</html>`
}

function buildBackupJson() {
  return JSON.stringify({
    app: 'budgetyar',
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: transactions.value,
    categories: categories.value,
    budgets: budgets.value,
    installments: installments.value,
    goals: goals.value,
    goalTransactions: goalTransactions.value,
    recurringItems: recurringItems.value,
    debts: debts.value,
    categorizationRules: categorizationRules.value,
    incomeSettings: incomeSettings.value,
    creditLimit: creditLimit.value,
    summary: {
      totalIncome: totalIncome.value,
      totalExpense: totalExpense.value,
      creditLimit: creditLimit.value,
      creditExpense: creditExpense.value,
      creditRemaining: creditRemaining.value,
      essentialExpense: essentialExpense.value,
      nonEssentialExpense: nonEssentialExpense.value,
      loanedExpense: loanedExpense.value,
      monthlyInstallmentDue: monthlyInstallmentDue.value,
      commitmentInstallmentDue: commitmentInstallmentDue.value,
      totalGoalsTarget: totalGoalsTarget.value,
      totalGoalsSaved: totalGoalsSaved.value,
      monthlyRecurringIncomeTotal: monthlyRecurringIncomeTotal.value,
      monthlyRecurringExpenseTotal: monthlyRecurringExpenseTotal.value,
      totalDebtRemaining: totalDebtRemaining.value,
      financialHealthScore: financialHealthScore.value.totalScore,
      recommendedBudgetBase: recommendedBudgetBase.value,
      balanceAfterCommitments: balanceAfterCommitments.value,
      balance: balance.value,
      totalBudget: totalBudget.value,
    },
  }, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function restoreCategories(value: unknown) {
  if (!Array.isArray(value)) return [...defaultCategories]

  const restored = value.filter((item): item is Category =>
    isRecord(item) &&
    typeof item.key === 'string' &&
    typeof item.label === 'string' &&
    typeof item.icon === 'string' &&
    typeof item.color === 'string',
  )

  return restored.length && restored.some((category) => category.key === 'other') ? restored : [...defaultCategories]
}

function restoreBudgets(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is BudgetGoal =>
    isRecord(item) &&
    typeof item.category === 'string' &&
    typeof item.budget === 'number',
  )
}

function restoreTransactions(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is Transaction =>
    isRecord(item) &&
    typeof item.id === 'number' &&
    (item.type === 'income' || item.type === 'expense') &&
    typeof item.title === 'string' &&
    typeof item.amount === 'number' &&
    typeof item.date === 'string',
  )
}

function restoreInstallments(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is InstallmentPlan =>
    isRecord(item) &&
    typeof item.id === 'number' &&
    typeof item.title === 'string' &&
    typeof item.amount === 'number' &&
    typeof item.category === 'string' &&
    typeof item.startDate === 'string' &&
    typeof item.dueDay === 'number' &&
    typeof item.totalCount === 'number' &&
    typeof item.paidCount === 'number' &&
    (item.paymentMethod === 'cash' || item.paymentMethod === 'credit'),
  )
}

function restoreGoals(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is BudgetyarGoal =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.targetAmount === 'number' &&
    typeof item.savedAmount === 'number' &&
    (item.priority === 'low' || item.priority === 'medium' || item.priority === 'high'),
  ).map((item) => ({
    ...item,
    unit: item.unit === 'goldGram' || item.unit === 'silverGram' || item.unit === 'usd' ? item.unit : 'irr',
    trackingMode: item.trackingMode === 'ASSET_FUNDING' || item.trackingMode === 'ASSET_HOLDING' ? item.trackingMode : 'FIXED_MONEY',
    baseCurrency: item.baseCurrency === 'usd' ? 'usd' : 'irr',
    targetQuantity: typeof item.targetQuantity === 'number' ? item.targetQuantity : undefined,
    assetCode: typeof item.assetCode === 'string' ? item.assetCode : undefined,
    targetValuePolicy: item.targetValuePolicy === 'INFLATION_INDEXED' || item.targetValuePolicy === 'MARKET_LINKED' ? item.targetValuePolicy : 'NOMINAL',
    inflationRate: typeof item.inflationRate === 'number' ? item.inflationRate : 0,
    priceSource: typeof item.priceSource === 'string' ? item.priceSource : undefined,
    contributionFrequency: item.contributionFrequency === 'weekly' || item.contributionFrequency === 'monthly' || item.contributionFrequency === 'salary-day' || item.contributionFrequency === 'custom' ? item.contributionFrequency : 'monthly',
    plannedContribution: typeof item.plannedContribution === 'number' ? item.plannedContribution : 0,
    reminderPolicy: item.reminderPolicy === 'every-week' || item.reminderPolicy === 'manual' || item.reminderPolicy === 'none' ? item.reminderPolicy : 'before-due',
    commitmentMode: item.commitmentMode === 'SOFT_WARNING' || item.commitmentMode === 'REQUIRE_REASON' || item.commitmentMode === 'COOLING_OFF' ? item.commitmentMode : 'NONE',
    coolingOffPeriod: typeof item.coolingOffPeriod === 'number' ? item.coolingOffPeriod : 0,
    isArchived: Boolean(item.isArchived),
    status: item.status === 'paused' || item.status === 'completed' || item.status === 'archived' ? item.status : 'active',
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : todayKey,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : todayKey,
  }))
}

function restoreGoalTransactions(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is BudgetyarGoalTransaction =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.goalId === 'string' &&
    typeof item.baseAmount === 'number' &&
    typeof item.quantity === 'number' &&
    typeof item.unitPrice === 'number' &&
    typeof item.fee === 'number' &&
    typeof item.occurredAt === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.idempotencyKey === 'string' &&
    (item.type === 'DEPOSIT' || item.type === 'WITHDRAWAL' || item.type === 'TRANSFER_IN' || item.type === 'TRANSFER_OUT' || item.type === 'ADJUSTMENT' || item.type === 'ASSET_PURCHASE' || item.type === 'ASSET_SALE'),
  ).map((item) => ({
    ...item,
    currency: item.currency === 'usd' ? 'usd' : 'irr',
    assetCode: typeof item.assetCode === 'string' ? item.assetCode : undefined,
    note: typeof item.note === 'string' ? item.note : undefined,
    sourceAccountId: typeof item.sourceAccountId === 'string' ? item.sourceAccountId : undefined,
    relatedTransactionId: typeof item.relatedTransactionId === 'string' ? item.relatedTransactionId : undefined,
  }))
}

function seedGoalTransactionsFromLegacyGoals(goalList = goals.value) {
  const seeded: BudgetyarGoalTransaction[] = []
  goalList.forEach((goal) => {
    const hasLedger = goalTransactions.value.some((transaction) => transaction.goalId === goal.id)
    if (hasLedger || goal.savedAmount <= 0) return
    seeded.push(buildGoalTransaction(goal, 'ADJUSTMENT', goal.savedAmount, 'مقدار اولیه هدف'))
  })

  return seeded
}

function restoreRecurringItems(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is BudgetyarRecurringItem =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    (item.type === 'income' || item.type === 'expense') &&
    typeof item.amount === 'number' &&
    (item.frequency === 'daily' || item.frequency === 'weekly' || item.frequency === 'monthly' || item.frequency === 'yearly') &&
    typeof item.startDate === 'string',
  ).map((item) => ({
    ...item,
    isSubscription: Boolean(item.isSubscription),
    isActive: item.isActive !== false,
    reminderDaysBefore: Math.max(0, Number(item.reminderDaysBefore) || 0),
    skippedDates: Array.isArray(item.skippedDates) ? item.skippedDates.filter((date): date is string => typeof date === 'string') : [],
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : todayKey,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : todayKey,
  }))
}

function restoreDebts(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is BudgetyarDebt =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.principalAmount === 'number' &&
    typeof item.remainingAmount === 'number' &&
    typeof item.minimumMonthlyPayment === 'number',
  ).map((item) => ({
    ...item,
    type: item.type ?? 'other',
    priority: item.priority ?? 'medium',
    isActive: item.isActive !== false,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : todayKey,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : todayKey,
  }))
}

function restoreCategorizationRules(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is BudgetyarCategorizationRule =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.categoryId === 'string' &&
    typeof item.priority === 'number',
  ).map((item) => ({
    ...item,
    isActive: item.isActive !== false,
    matchType: item.matchType ?? 'contains',
    applyToExisting: Boolean(item.applyToExisting),
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : todayKey,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : todayKey,
  }))
}

function buildDefaultCategorizationRules(): BudgetyarCategorizationRule[] {
  return defaultCategorizationRuleTemplates.map((template) => {
    const preferredCategory = categories.value.find((category) => category.label === template.preferredCategory)
    const fallbackCategory = categories.value.find((category) => category.key === template.fallbackCategory)

    return {
      id: `preset-${template.id}`,
      title: template.title,
      isActive: true,
      matchType: 'contains',
      pattern: template.pattern,
      categoryId: preferredCategory?.key ?? fallbackCategory?.key ?? 'other',
      transactionType: 'expense',
      priority: 20,
      applyToExisting: false,
      createdAt: todayKey,
      updatedAt: todayKey,
    }
  })
}

function restoreIncomeSettings(value: unknown) {
  if (!isRecord(value)) return { ...defaultIncomeSettings }

  return {
    ...defaultIncomeSettings,
    ...value,
    historyMonths: value.historyMonths === 6 || value.historyMonths === 12 ? value.historyMonths : 3,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : todayKey,
  } as BudgetyarIncomeSettings
}

async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const backup = JSON.parse(await file.text()) as unknown
    if (!isRecord(backup) || backup.app !== 'budgetyar') {
      pushToast('این فایل بکاپ پولدار نیست')
      return
    }

    const summary = isRecord(backup.summary) ? backup.summary : {}
    transactions.value = restoreTransactions(backup.transactions)
    categories.value = restoreCategories(backup.categories)
    budgets.value = restoreBudgets(backup.budgets)
    installments.value = restoreInstallments(backup.installments)
    goals.value = restoreGoals(backup.goals)
    goalTransactions.value = restoreGoalTransactions((backup as Record<string, unknown>).goalTransactions)
    goals.value.forEach((goal) => refreshGoalState(goal.id))
    recurringItems.value = restoreRecurringItems(backup.recurringItems)
    debts.value = restoreDebts(backup.debts)
    categorizationRules.value = restoreCategorizationRules(backup.categorizationRules)
    incomeSettings.value = restoreIncomeSettings(backup.incomeSettings)
    creditLimit.value = Math.max(0, Number(backup.creditLimit ?? summary.creditLimit ?? 0) || 0)
    selectedCategory.value = 'همه'
    selectedType.value = 'همه'
    query.value = ''
    dateRange.start = ''
    dateRange.end = ''
    pushToast('بکاپ با موفقیت بازیابی شد ✅')
  } catch {
    pushToast('خواندن بکاپ ناموفق بود')
  } finally {
    input.value = ''
  }
}

function createExportFile(format: ExportFormat) {
  const stamp = getExportDateStamp()

  if (format === 'CSV') {
    return {
      blob: new Blob([buildCsvReport()], { type: 'text/csv;charset=utf-8' }),
      filename: `budgetyar-report-${stamp}.csv`,
      message: 'فایل CSV آماده ذخیره شد ✅',
    }
  }

  if (format === 'Excel') {
    return {
      blob: new Blob([buildExcelReport()], { type: 'application/vnd.ms-excel;charset=utf-8' }),
      filename: `budgetyar-report-${stamp}.xls`,
      message: 'فایل Excel آماده ذخیره شد ✅',
    }
  }

  if (format === 'PDF') {
    return {
      blob: new Blob([buildExcelReport()], { type: 'text/html;charset=utf-8' }),
      filename: `budgetyar-printable-report-${stamp}.html`,
      message: 'نسخه قابل چاپ ذخیره شد؛ برای PDF از گزینه Print استفاده کنید ✅',
    }
  }

  return {
    blob: new Blob([buildBackupJson()], { type: 'application/json;charset=utf-8' }),
    filename: `budgetyar-backup-${stamp}.json`,
    message: 'بکاپ پولدار آماده ذخیره شد ✅',
  }
}

async function saveBlobToDevice(blob: Blob, filename: string, successMessage: string) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
  const shareNavigator = navigator as FileShareNavigator

  if (shareNavigator.canShare?.({ files: [file] }) && shareNavigator.share) {
    try {
      await shareNavigator.share({
        files: [file],
        title: filename,
        text: 'خروجی پولدار',
      })
      pushToast(successMessage)
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        pushToast('ذخیره فایل لغو شد')
        return
      }
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  pushToast(successMessage)
}

async function exportReport(format: ExportFormat) {
  const exportFile = createExportFile(format)
  await saveBlobToDevice(exportFile.blob, exportFile.filename, exportFile.message)
}

async function installApp() {
  if (isStandalone.value) {
    pushToast('برنامه نصب شده است ✅')
    return
  }

  if (!installPrompt.value) {
    pushToast('از منوی مرورگر گزینه Add to Home Screen را بزنید')
    return
  }

  const promptEvent = installPrompt.value
  await promptEvent.prompt()
  const choice = await promptEvent.userChoice
  installPrompt.value = null

  pushToast(choice.outcome === 'accepted' ? 'برنامه نصب شد ✅' : 'نصب لغو شد')
}

function pushToast(text: string) {
  const id = Date.now()
  toasts.value.push({ id, text })
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }, 2800)
}

function baseChartOptions(): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    resizeDelay: 160,
    devicePixelRatio: isMobileViewport.value ? 1 : undefined,
    locale: 'fa-IR',
    plugins: {
      legend: {
        display: false,
        rtl: true,
        labels: {
          color: chartTextColor(),
          font: { family: chartFontFamily },
        },
      },
      tooltip: {
        rtl: true,
        textDirection: 'rtl',
        backgroundColor: chartTooltipBackground(),
        borderColor: 'rgba(255, 255, 255, .12)',
        borderWidth: 1,
        bodyColor: chartTooltipBodyColor(),
        titleColor: chartTextColor(),
        bodyFont: { family: chartFontFamily },
        titleFont: { family: chartFontFamily },
        padding: 12,
      },
    },
  }
}

function doughnutOptions(): ChartOptions<'doughnut'> {
  return {
    ...baseChartOptions(),
    cutout: '64%',
    plugins: {
      ...baseChartOptions().plugins,
      tooltip: {
        ...baseChartOptions().plugins?.tooltip,
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const value = Number(context.raw ?? 0)
            const percent = hasExpenseData.value ? Math.round((value / Math.max(totalExpense.value, 1)) * 100) : 0

            return hasExpenseData.value ? `${context.label}: ${formatCompact(value)} (${toPersianNumber(percent)}٪)` : 'هنوز هزینه‌ای ثبت نشده است'
          },
        },
      },
    },
  }
}

function doughnutDatasetOptions(emptyLabel = 'هنوز داده‌ای ثبت نشده است'): ChartOptions<'doughnut'> {
  return {
    ...baseChartOptions(),
    cutout: '64%',
    plugins: {
      ...baseChartOptions().plugins,
      tooltip: {
        ...baseChartOptions().plugins?.tooltip,
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const dataset = context.dataset.data.map((item) => Number(item) || 0)
            const total = dataset.reduce((sum, item) => sum + item, 0)
            const value = Number(context.raw ?? 0)
            const percent = total ? Math.round((value / total) * 100) : 0

            return total ? `${context.label}: ${formatCompact(value)} (${toPersianNumber(percent)}٪)` : emptyLabel
          },
        },
      },
    },
  }
}

function barOptions(): ChartOptions<'bar'> {
  return {
    ...baseChartOptions(),
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: chartGridColor() },
        ticks: {
          color: chartMutedColor(),
          font: { family: chartFontFamily },
          callback: (value) => formatCompact(Number(value)),
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: chartTextColor(),
          font: { family: chartFontFamily },
        },
      },
    },
  }
}

function lineOptions(): ChartOptions<'line'> {
  return {
    ...baseChartOptions(),
    elements: {
      point: {
        radius: isMobileViewport.value ? 0 : 2,
        hitRadius: 8,
      },
      line: {
        tension: 0.32,
      },
    },
    plugins: {
      ...baseChartOptions().plugins,
      legend: {
        display: true,
        rtl: true,
        position: 'bottom',
        labels: {
          color: chartTextColor(),
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          font: { family: chartFontFamily },
        },
      },
    },
    scales: {
      x: {
        grid: { color: chartGridColor() },
        ticks: {
          color: chartMutedColor(),
          font: { family: chartFontFamily },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartGridColor() },
        ticks: {
          color: chartMutedColor(),
          font: { family: chartFontFamily },
          callback: (value) => formatCompact(Number(value)),
        },
      },
    },
  }
}

function polarAreaOptions(): ChartOptions<'polarArea'> {
  return {
    ...baseChartOptions(),
    scales: {
      r: {
        grid: { color: chartGridColor() },
        ticks: {
          backdropColor: 'transparent',
          color: chartMutedColor(),
          font: { family: chartFontFamily },
          callback: (value) => formatCompact(Number(value)),
        },
        pointLabels: {
          color: chartTextColor(),
          font: { family: chartFontFamily },
        },
      },
    },
    plugins: {
      ...baseChartOptions().plugins,
      tooltip: {
        ...baseChartOptions().plugins?.tooltip,
        callbacks: {
          label: (context: TooltipItem<'polarArea'>) => {
            const value = Number(context.raw ?? 0)
            const percent = hasExpenseData.value ? Math.round((value / Math.max(totalExpense.value, 1)) * 100) : 0

            return hasExpenseData.value ? `${context.label}: ${formatCompact(value)} (${toPersianNumber(percent)}٪)` : 'هنوز هزینه‌ای ثبت نشده است'
          },
        },
      },
    },
  }
}

function stackedBudgetOptions(): ChartOptions<'bar'> {
  return {
    ...baseChartOptions(),
    indexAxis: 'y',
    plugins: {
      ...baseChartOptions().plugins,
      legend: {
        display: true,
        rtl: true,
        position: 'bottom',
        labels: {
          color: chartTextColor(),
          boxWidth: 10,
          boxHeight: 10,
          font: { family: chartFontFamily },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        grid: { color: chartGridColor() },
        ticks: {
          color: chartMutedColor(),
          font: { family: chartFontFamily },
          callback: (value) => formatCompact(Number(value)),
        },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: chartTextColor(),
          font: { family: chartFontFamily },
        },
      },
    },
  }
}

function cashFlowOptions(): ChartOptions<'bar'> {
  return {
    ...baseChartOptions(),
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: chartTextColor(),
          font: { family: chartFontFamily },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartGridColor() },
        ticks: {
          color: chartMutedColor(),
          font: { family: chartFontFamily },
          callback: (value) => formatCompact(Number(value)),
        },
      },
    },
  }
}

function createCharts() {
  if (!expenseShareChart.value && expenseShareCanvas.value) {
    expenseShareChart.value = new Chart(expenseShareCanvas.value, {
      type: 'doughnut',
      data: expenseShareChartData.value,
      options: doughnutOptions(),
    })
  }

  if (!categoryBarChart.value && categoryBarCanvas.value) {
    categoryBarChart.value = new Chart(categoryBarCanvas.value, {
      type: 'bar',
      data: categoryBarChartData.value,
      options: barOptions(),
    })
  }

  if (!trendLineChart.value && trendLineCanvas.value) {
    trendLineChart.value = new Chart(trendLineCanvas.value, {
      type: 'line',
      data: trendLineChartData.value,
      options: lineOptions(),
    })
  }

  if (!statsExpenseMixChart.value && statsExpenseMixCanvas.value) {
    statsExpenseMixChart.value = new Chart(statsExpenseMixCanvas.value, {
      type: 'polarArea',
      data: statsExpenseMixChartData.value,
      options: polarAreaOptions(),
    })
  }

  if (!statsBudgetUsageChart.value && statsBudgetUsageCanvas.value) {
    statsBudgetUsageChart.value = new Chart(statsBudgetUsageCanvas.value, {
      type: 'bar',
      data: statsBudgetUsageChartData.value,
      options: stackedBudgetOptions(),
    })
  }

  if (!statsDailyExpenseChart.value && statsDailyExpenseCanvas.value) {
    statsDailyExpenseChart.value = new Chart(statsDailyExpenseCanvas.value, {
      type: 'line',
      data: statsDailyExpenseChartData.value,
      options: lineOptions(),
    })
  }

  if (!statsWeeklyFlowChart.value && statsWeeklyFlowCanvas.value) {
    statsWeeklyFlowChart.value = new Chart(statsWeeklyFlowCanvas.value, {
      type: 'bar',
      data: statsWeeklyFlowChartData.value,
      options: cashFlowOptions(),
    })
  }

  if (!statsCashFlowChart.value && statsCashFlowCanvas.value) {
    statsCashFlowChart.value = new Chart(statsCashFlowCanvas.value, {
      type: 'bar',
      data: statsCashFlowChartData.value,
      options: cashFlowOptions(),
    })
  }

  if (!statsEssentialChart.value && statsEssentialCanvas.value) {
    statsEssentialChart.value = new Chart(statsEssentialCanvas.value, {
      type: 'doughnut',
      data: statsEssentialChartData.value,
      options: doughnutOptions(),
    })
  }

  if (!statsPaymentMethodChart.value && statsPaymentMethodCanvas.value) {
    statsPaymentMethodChart.value = new Chart(statsPaymentMethodCanvas.value, {
      type: 'bar',
      data: statsPaymentMethodChartData.value,
      options: cashFlowOptions(),
    })
  }

  if (!statsMonthlyTrendChart.value && statsMonthlyTrendCanvas.value) {
    statsMonthlyTrendChart.value = new Chart(statsMonthlyTrendCanvas.value, {
      type: 'line',
      data: statsMonthlyTrendChartData.value,
      options: lineOptions(),
    })
  }

  if (!statsCommitmentChart.value && statsCommitmentCanvas.value) {
    statsCommitmentChart.value = new Chart(statsCommitmentCanvas.value, {
      type: 'doughnut',
      data: statsCommitmentChartData.value,
      options: doughnutDatasetOptions('هنوز تعهدی ثبت نشده است'),
    })
  }
}

function syncCharts() {
  // Each page owns its canvas refs. Create/update only the charts whose
  // canvases are currently mounted; section labels may change independently
  // from the chart lifecycle.
  if (statsBudgetUsageChart.value && !statsBudgetUsageCanvas.value) {
    statsBudgetUsageChart.value.destroy()
    statsBudgetUsageChart.value = null
  }

  createCharts()

  if (expenseShareChart.value) {
    expenseShareChart.value.data = expenseShareChartData.value
    expenseShareChart.value.update('none')
  }

  if (categoryBarChart.value) {
    categoryBarChart.value.data = categoryBarChartData.value
    categoryBarChart.value.update('none')
  }

  if (trendLineChart.value) {
    trendLineChart.value.data = trendLineChartData.value
    trendLineChart.value.update('none')
  }

  if (statsExpenseMixChart.value) {
    statsExpenseMixChart.value.data = statsExpenseMixChartData.value
    statsExpenseMixChart.value.update('none')
  }

  if (statsBudgetUsageChart.value) {
    statsBudgetUsageChart.value.data = statsBudgetUsageChartData.value
    statsBudgetUsageChart.value.update('none')
  }

  if (statsDailyExpenseChart.value) {
    statsDailyExpenseChart.value.data = statsDailyExpenseChartData.value
    statsDailyExpenseChart.value.update('none')
  }

  if (statsWeeklyFlowChart.value) {
    statsWeeklyFlowChart.value.data = statsWeeklyFlowChartData.value
    statsWeeklyFlowChart.value.update('none')
  }

  if (statsCashFlowChart.value) {
    statsCashFlowChart.value.data = statsCashFlowChartData.value
    statsCashFlowChart.value.update('none')
  }

  if (statsEssentialChart.value) {
    statsEssentialChart.value.data = statsEssentialChartData.value
    statsEssentialChart.value.update('none')
  }

  if (statsPaymentMethodChart.value) {
    statsPaymentMethodChart.value.data = statsPaymentMethodChartData.value
    statsPaymentMethodChart.value.update('none')
  }

  if (statsMonthlyTrendChart.value) {
    statsMonthlyTrendChart.value.data = statsMonthlyTrendChartData.value
    statsMonthlyTrendChart.value.update('none')
  }

  if (statsCommitmentChart.value) {
    statsCommitmentChart.value.data = statsCommitmentChartData.value
    statsCommitmentChart.value.update('none')
  }
}

function scheduleChartSync() {
  if (typeof window === 'undefined') return

  if (chartSyncFrame !== null) {
    window.cancelAnimationFrame(chartSyncFrame)
  }

  chartSyncFrame = window.requestAnimationFrame(() => {
    chartSyncFrame = null
    syncCharts()
  })
}

function destroyCharts() {
  if (chartSyncFrame !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(chartSyncFrame)
    chartSyncFrame = null
  }

  expenseShareChart.value?.destroy()
  categoryBarChart.value?.destroy()
  trendLineChart.value?.destroy()
  statsExpenseMixChart.value?.destroy()
  statsBudgetUsageChart.value?.destroy()
  statsDailyExpenseChart.value?.destroy()
  statsWeeklyFlowChart.value?.destroy()
  statsCashFlowChart.value?.destroy()
  statsEssentialChart.value?.destroy()
  statsPaymentMethodChart.value?.destroy()
  statsMonthlyTrendChart.value?.destroy()
  statsCommitmentChart.value?.destroy()
  expenseShareChart.value = null
  categoryBarChart.value = null
  trendLineChart.value = null
  statsExpenseMixChart.value = null
  statsBudgetUsageChart.value = null
  statsDailyExpenseChart.value = null
  statsWeeklyFlowChart.value = null
  statsCashFlowChart.value = null
  statsEssentialChart.value = null
  statsPaymentMethodChart.value = null
  statsMonthlyTrendChart.value = null
  statsCommitmentChart.value = null
}

function bindMobileViewport() {
  if (typeof window === 'undefined') return

  mobileViewportQuery = window.matchMedia('(max-width: 760px)')
  isMobileViewport.value = mobileViewportQuery.matches
  mobileViewportListener = (event) => {
    isMobileViewport.value = event.matches
    destroyCharts()
    scheduleChartSync()
  }
  mobileViewportQuery.addEventListener('change', mobileViewportListener)
}

function unbindMobileViewport() {
  if (mobileViewportQuery && mobileViewportListener) {
    mobileViewportQuery.removeEventListener('change', mobileViewportListener)
  }

  mobileViewportQuery = null
  mobileViewportListener = null
}

export function useBudgetyar() {
  return {
    activeSection, isMobileMenuOpen, isMobileViewport, navItems, months, years, today, todayKey, currentMonthYear, currentJalaliDate, currentMonthLength,
    categories, transactions, budgets, installments, goals, goalTransactions, recurringItems, debts, categorizationRules, incomeSettings, creditLimit, cashFlowMode, themeMode, cashflowForecastPeriod, selectedDebtStrategy, marketRates, marketRatesLoading, marketRatesError,
    query, selectedMonth, selectedYear, selectedCategory, selectedType, dateRange, pickerDateRange,
    isModalOpen, formType, form, formAmountInWords, formDatePickerValue, editingId, toasts,
    categoryForm, installmentForm, editingInstallmentId, installmentAmountInWords, installmentStartDatePickerValue,
    goalForm, editingGoalId, goalTargetAmountInWords, goalSavedAmountInWords, goalTargetDatePickerValue,
    recurringForm, editingRecurringItemId, recurringAmountInWords, recurringStartDatePickerValue, recurringEndDatePickerValue,
    purchaseForm, purchaseAmountInWords, purchaseDatePickerValue, purchaseDecision,
    debtForm, editingDebtId, debtPrincipalAmountInWords, debtRemainingAmountInWords, debtMinimumPaymentInWords, debtStartDatePickerValue, debtTargetPayoffDatePickerValue,
    categorizationRuleForm, editingCategorizationRuleId, ruleMinAmountInWords, ruleMaxAmountInWords,
    installPrompt, isStandalone, isAndroidNative, isNotificationsLoading, bankApps, bankSuggestions, selectedBankPackage, bankNotificationStatus,
    expenseShareCanvas, categoryBarCanvas, trendLineCanvas, statsExpenseMixCanvas, statsBudgetUsageCanvas, statsDailyExpenseCanvas, statsWeeklyFlowCanvas, statsCashFlowCanvas, statsEssentialCanvas, statsPaymentMethodCanvas, statsMonthlyTrendCanvas, statsCommitmentCanvas,
    currentMonthTransactions, currentWeekTransactions, expenseTransactions, incomeTransactions, weeklyExpenseTransactions, weeklyIncomeTransactions,
    totalIncome, totalExpense, creditExpense, creditRemaining, cashExpense, cashBeforeCreditPayment, balanceAfterCreditPayment, balanceAfterCommitments,
    loanedExpense, essentialExpense, nonEssentialExpense, weeklyIncome, weeklyExpense, weeklyCreditExpense, weeklyBalance, totalBudget, weeklyBudgetAllowance, balance, budgetUsage, savingsPercent,
    categoryTotals, weeklyCategoryBudgets, weeklyBudgetAnalysis, sortedCategoryTotals, visibleCategoryTotals, safeMaxCategory, highestExpense, lowestExpense, todayExpense, todayIncome, averageDailyExpense, latestExpenses, latestLoans,
    installmentSummaries, activeInstallmentSummaries, overdueInstallments, upcomingInstallments, dueInstallmentsThisMonth, monthlyInstallmentDue, commitmentInstallmentDue,
    activeGoals, archivedGoals, totalGoalsTarget, totalGoalsSaved, totalGoalsRemaining, nearestGoal,
    activeRecurringItems, recurringSummaries, upcomingRecurringItems, dueRecurringItems, overdueRecurringItems, monthlyRecurringIncomeTotal, monthlyRecurringExpenseTotal, monthlySubscriptionsTotal,
    cashflowForecastDays, projectedEndOfMonthBalance, lowestProjectedBalance, cashflowRiskLevel, cashflowWarnings, safeDailySpend, safeWeeklySpend,
    activeDebts, totalDebtRemaining, totalMinimumDebtPayments, totalExtraDebtPayments, snowballDebtPlan, avalancheDebtPlan, selectedDebtPayoffPlan, recommendedDebtStrategy, debtFreedomDate, estimatedInterestSavings, nextDebtDue,
    activeCategorizationRules, suggestedCategorizationRules,
    recentMonthlyIncome, averageMonthlyIncome, lowestRecentMonthlyIncome, highestRecentMonthlyIncome, incomeVolatilityPercent, recommendedBudgetBase, recommendedEssentialBudget, recommendedSavingBudget, recommendedFlexibleBudget, badMonthReserveSuggestion, irregularIncomeWarnings,
    financialHealthScore, financialHealthLevel, financialHealthSuggestions, financialHealthWarnings, financialHealthStrengths,
    filteredTransactions, dailyTrend, hasExpenseData, expenseShareChartData, categoryBarChartData, trendLineChartData, dailyExpensePoints, weeklyFlowPoints, budgetAnalysisItems, monthlyTrendPoints, hasMonthlyTrendData, commitmentTotal, flexibleAfterCommitments, statsExpenseMixChartData, statsBudgetUsageChartData, statsDailyExpenseChartData, statsWeeklyFlowChartData, statsCashFlowChartData, statsEssentialChartData, statsPaymentMethodChartData, statsMonthlyTrendChartData, statsCommitmentChartData,
    summaryLines, insights, dashboardCards, widgets, statsItems,
    getCategory, normalizeDigits, normalizeJalaliDate, getJalaliInputDay, getTrendDays, getPreviousMonthPrefix, addJalaliMonths, getInstallmentDueDate, getInstallmentStatus, getInstallmentStatusLabel, getCurrentWeekRange, getWeekdayLabel, getJalaliMonthPrefix, getCurrentJalaliDate, formatJalaliInputDate, formatDisplayJalaliDate, jalaliInputToIso, isoToJalaliInput, toPersianNumber, parseMoneyInput, formatMoneyInput, formatMoneyWords, formatMoney, formatCompact, progressPercent, getChangePercent, formatPercentHint, formatChangeSentence, getRiskLabel, getFinancialHealthLevelLabel,
    selectSection, openModal, editTransaction, saveTransaction, removeTransaction, refreshBankNotifications, openNotificationAccessSettings, updateSelectedBankPackage, acceptBankSuggestion, dismissBankSuggestion, formatSuggestionDate, updateMoneyInput, updateCreditLimit, updateBudget, addCategory, deleteCategory, addInstallmentPlan, editInstallmentPlan, cancelInstallmentEdit, payInstallment, removeInstallmentPlan,
    addGoal, editGoal, updateGoal, deleteGoal, archiveGoal, pauseGoal, resumeGoal, addGoalContribution, withdrawFromGoal, getGoalProgress, getGoalRemainingAmount, getGoalSuggestedMonthlySaving, getGoalSuggestedWeeklySaving, getGoalUnitLabel, getGoalTransactionTypeLabel, formatGoalAmount, getGoalEstimatedValue, getGoalTrackingModeLabel, getGoalHealthLabel, getGoalScenario, getGoalTransactions, getGoalSummary, getGoalSavedValue, getGoalTargetValue,
    addRecurringItem, editRecurringItem, updateRecurringItem, deleteRecurringItem, toggleRecurringItem, getRecurringNextDueDate, markRecurringItemPaid, skipRecurringOccurrence, createTransactionFromRecurringItem, getRecurringStatusLabel, createPurchaseTransaction, setThemeMode, refreshMarketRates,
    addDebt, editDebt, updateDebt, deleteDebt, toggleDebt, recordDebtPayment, calculateDebtPayoffPlan,
    addCategorizationRule, editCategorizationRule, updateCategorizationRule, deleteCategorizationRule, toggleCategorizationRule, matchTransactionCategoryRule, applyCategorizationRulesToTransaction, applyCategorizationRulesToAllTransactions, suggestCategorizationRules, acceptSuggestedCategorizationRule, bulkUpdateTransactionCategory,
    updateIncomeSettings, applyRecommendedBudgetPlan,
    getTransactionCategoryLabel, getPaymentMethodLabel, getNecessityLabel, buildCsvReport, buildExcelReport, buildBackupJson, importBackup, createExportFile, saveBlobToDevice, exportReport, installApp, pushToast,
    createCharts, syncCharts, scheduleChartSync, destroyCharts,
  }
}

let budgetyarStarted = false
export function startBudgetyar() {
  if (budgetyarStarted) return
  budgetyarStarted = true
  onMounted(() => {
    bindMobileViewport()
    isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    isAndroidNative.value = Capacitor.getPlatform() === 'android'
  
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      installPrompt.value = event as InstallPromptEvent
    })
  
    window.addEventListener('appinstalled', () => {
      isStandalone.value = true
      installPrompt.value = null
      pushToast('پولدار نصب شد ✅')
    })
  
    const savedTransactions = localStorage.getItem(STORAGE_KEY)
    const savedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY)
    const savedBudgets = localStorage.getItem(BUDGETS_STORAGE_KEY)
    const savedCreditLimit = localStorage.getItem(CREDIT_STORAGE_KEY)
    const savedInstallments = localStorage.getItem(INSTALLMENTS_STORAGE_KEY)
    const savedThemeMode = localStorage.getItem(THEME_STORAGE_KEY)
    const savedGoals = localStorage.getItem(GOALS_STORAGE_KEY)
    const savedRecurringItems = localStorage.getItem(RECURRING_ITEMS_STORAGE_KEY)
    const savedDebts = localStorage.getItem(DEBTS_STORAGE_KEY)
    const savedCategorizationRules = localStorage.getItem(CATEGORIZATION_RULES_STORAGE_KEY)
    const savedIncomeSettings = localStorage.getItem(INCOME_SETTINGS_STORAGE_KEY)
    const savedMarketRates = localStorage.getItem('budgetyar-market-rates-v1')
    if (savedMarketRates) {
      try { marketRates.value = JSON.parse(savedMarketRates) } catch { localStorage.removeItem('budgetyar-market-rates-v1') }
    }
  
    if (savedTransactions) {
      try {
        transactions.value = JSON.parse(savedTransactions) as Transaction[]
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  
    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories) as Category[]
        if (parsedCategories.length && parsedCategories.some((category) => category.key === 'other')) {
          categories.value = parsedCategories
        }
      } catch {
        localStorage.removeItem(CATEGORIES_STORAGE_KEY)
      }
    }
  
    if (savedBudgets) {
      try {
        budgets.value = JSON.parse(savedBudgets) as BudgetGoal[]
      } catch {
        localStorage.removeItem(BUDGETS_STORAGE_KEY)
      }
    }
  
    if (savedCreditLimit) {
      creditLimit.value = Math.max(0, parseMoneyInput(savedCreditLimit))
    }
  
    if (savedInstallments) {
      try {
        installments.value = JSON.parse(savedInstallments) as InstallmentPlan[]
      } catch {
        localStorage.removeItem(INSTALLMENTS_STORAGE_KEY)
      }
    }

    if (savedGoals) {
      try {
        goals.value = restoreGoals(JSON.parse(savedGoals))
      } catch {
        localStorage.removeItem(GOALS_STORAGE_KEY)
      }
    }

    const savedGoalTransactions = localStorage.getItem(GOAL_TRANSACTIONS_STORAGE_KEY)
    if (savedGoalTransactions) {
      try {
        goalTransactions.value = restoreGoalTransactions(JSON.parse(savedGoalTransactions))
      } catch {
        localStorage.removeItem(GOAL_TRANSACTIONS_STORAGE_KEY)
      }
    }
    if (!goalTransactions.value.length && goals.value.length) {
      goalTransactions.value = seedGoalTransactionsFromLegacyGoals(goals.value)
    }
    goals.value.forEach((goal) => refreshGoalState(goal.id))

    if (savedRecurringItems) {
      try {
        recurringItems.value = restoreRecurringItems(JSON.parse(savedRecurringItems))
      } catch {
        localStorage.removeItem(RECURRING_ITEMS_STORAGE_KEY)
      }
    }

    if (savedDebts) {
      try {
        debts.value = restoreDebts(JSON.parse(savedDebts))
      } catch {
        localStorage.removeItem(DEBTS_STORAGE_KEY)
      }
    }

    if (savedCategorizationRules) {
      try {
        categorizationRules.value = restoreCategorizationRules(JSON.parse(savedCategorizationRules))
      } catch {
        localStorage.removeItem(CATEGORIZATION_RULES_STORAGE_KEY)
      }
    }

    const deletedDefaultRuleIds = new Set<string>()
    try {
      const savedDeletedIds = JSON.parse(localStorage.getItem(DELETED_DEFAULT_CATEGORIZATION_RULES_STORAGE_KEY) ?? '[]')
      if (Array.isArray(savedDeletedIds)) savedDeletedIds.filter((item): item is string => typeof item === 'string').forEach((item) => deletedDefaultRuleIds.add(item))
    } catch {
      localStorage.removeItem(DELETED_DEFAULT_CATEGORIZATION_RULES_STORAGE_KEY)
    }
    const existingPatterns = new Set(categorizationRules.value.map((rule) => rule.pattern).filter(Boolean))
    const missingDefaults = buildDefaultCategorizationRules().filter((rule) => !deletedDefaultRuleIds.has(rule.id) && !existingPatterns.has(rule.pattern))
    if (missingDefaults.length) {
      categorizationRules.value = [...categorizationRules.value, ...missingDefaults]
      localStorage.setItem(CATEGORIZATION_RULES_STORAGE_KEY, JSON.stringify(categorizationRules.value))
    }

    if (savedIncomeSettings) {
      try {
        incomeSettings.value = restoreIncomeSettings(JSON.parse(savedIncomeSettings))
      } catch {
        localStorage.removeItem(INCOME_SETTINGS_STORAGE_KEY)
      }
    }

    if (savedThemeMode === 'light' || savedThemeMode === 'dark' || savedThemeMode === 'forest') {
      themeMode.value = savedThemeMode
    }
    applyTheme()
  
    if ('serviceWorker' in navigator) {
      if (import.meta.env.PROD) {
        navigator.serviceWorker.register('/sw.js')
      } else {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister())
        })
        if ('caches' in window) {
          window.caches.keys().then((keys) => {
            keys.filter((key) => key.startsWith('budgetyar-')).forEach((key) => window.caches.delete(key))
          })
        }
      }
    }
  
    if (isAndroidNative.value) {
      refreshBankNotifications()
    }
  
    nextTick(scheduleChartSync)
  })
  
  onBeforeUnmount(() => {
    unbindMobileViewport()
    destroyCharts()
  })
  
  watch(
    transactions,
    (value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )
  
  watch(
    categories,
    (value) => {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )
  
  watch(
    budgets,
    (value) => {
      localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )
  
  watch(creditLimit, (value) => {
    localStorage.setItem(CREDIT_STORAGE_KEY, String(value))
  })

  watch(themeMode, (value) => {
    localStorage.setItem(THEME_STORAGE_KEY, value)
    applyTheme(value)
    destroyCharts()
    nextTick(scheduleChartSync)
  })
  
  watch(
    installments,
    (value) => {
      localStorage.setItem(INSTALLMENTS_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  watch(
    goals,
    (value) => {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  watch(
    goalTransactions,
    (value) => {
      localStorage.setItem(GOAL_TRANSACTIONS_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  watch(
    marketRates,
    () => {
      activeGoals.value.forEach((goal) => {
        if (goal.trackingMode !== 'FIXED_MONEY') refreshGoalState(goal.id)
      })
    },
    { deep: true },
  )

  watch(
    recurringItems,
    (value) => {
      localStorage.setItem(RECURRING_ITEMS_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  watch(
    debts,
    (value) => {
      localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  watch(
    categorizationRules,
    (value) => {
      localStorage.setItem(CATEGORIZATION_RULES_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  watch(
    incomeSettings,
    (value) => {
      localStorage.setItem(INCOME_SETTINGS_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )
  
  watch(
    [
      expenseShareChartData,
      categoryBarChartData,
      trendLineChartData,
      statsExpenseMixChartData,
      statsBudgetUsageChartData,
      statsDailyExpenseChartData,
      statsWeeklyFlowChartData,
      statsCashFlowChartData,
      statsEssentialChartData,
      statsPaymentMethodChartData,
      statsMonthlyTrendChartData,
      statsCommitmentChartData,
    ],
    () => {
      nextTick(scheduleChartSync)
    },
    { deep: true },
  )
  
  watch(activeSection, () => {
    destroyCharts()
    nextTick(scheduleChartSync)
  })
}


