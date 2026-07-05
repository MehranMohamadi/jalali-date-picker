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

Chart.register(...registerables)
const BankNotifications = registerPlugin<BankNotificationsPlugin>('BankNotifications')

export type TransactionType = 'income' | 'expense'
export type PaymentMethod = 'cash' | 'credit'
export type CashFlowMode = 'regular' | 'afterCredit' | 'afterCommitments'

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
const STORAGE_KEY = 'budgetyar-transactions-v1'
const CATEGORIES_STORAGE_KEY = 'budgetyar-categories-v1'
const BUDGETS_STORAGE_KEY = 'budgetyar-budgets-v1'
const CREDIT_STORAGE_KEY = 'budgetyar-credit-limit-v1'
const INSTALLMENTS_STORAGE_KEY = 'budgetyar-installments-v1'
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
const expenseShareChart = shallowRef<Chart<'doughnut'> | null>(null)
const categoryBarChart = shallowRef<Chart<'bar'> | null>(null)
const trendLineChart = shallowRef<Chart<'line'> | null>(null)
const statsExpenseMixChart = shallowRef<Chart<'polarArea'> | null>(null)
const statsBudgetUsageChart = shallowRef<Chart<'bar'> | null>(null)
const statsDailyExpenseChart = shallowRef<Chart<'line'> | null>(null)
const statsWeeklyFlowChart = shallowRef<Chart<'bar'> | null>(null)
const statsCashFlowChart = shallowRef<Chart<'bar'> | null>(null)

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
const installmentAmountInWords = computed(() => formatMoneyWords(installmentForm.amount))
const installmentStartDatePickerValue = computed({
  get: () => jalaliInputToIso(installmentForm.startDate),
  set: (value: string | null) => {
    installmentForm.startDate = value ? isoToJalaliInput(value) : ''
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
const chartTextColor = '#cbd5e1'
const chartMutedColor = '#94a3b8'
const chartGridColor = 'rgba(255, 255, 255, .08)'

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

const incomeChangePercent = computed(() => getChangePercent(totalIncome.value, previousIncome.value))
const expenseChangePercent = computed(() => getChangePercent(totalExpense.value, previousExpense.value))
const projectedSavings = computed(() => {
  const elapsedDays = Math.max(currentJalaliDate.day, 1)
  const projectedExpense = Math.round((totalExpense.value / elapsedDays) * currentMonthLength)

  return Math.max(0, totalIncome.value - projectedExpense)
})

const summaryLines = computed(() => [
  `این ماه ${toPersianNumber(budgetUsage.value)}٪ بودجه مصرف شده است.`,
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
])

const widgets = computed(() => [
  { label: 'امروز', value: today, icon: '📅' },
  { label: 'خرج امروز', value: formatMoney(todayExpense.value), icon: '💸' },
  { label: 'درآمد امروز', value: formatMoney(todayIncome.value), icon: '💰' },
  { label: 'اعتبار مانده', value: formatMoney(creditRemaining.value), icon: '💳' },
  { label: 'قسط ماه', value: formatMoney(monthlyInstallmentDue.value), icon: '🧾' },
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
  return amount ? new Intl.NumberFormat('fa-IR').format(amount) : ''
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

  const payload: Transaction = {
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

function addInstallmentPlan() {
  const title = installmentForm.title.trim()
  const amount = Math.max(0, Number(installmentForm.amount) || 0)
  const totalCount = Math.max(1, Math.trunc(Number(installmentForm.totalCount) || 0))
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

  installments.value = [plan, ...installments.value]
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
  pushToast('قسط اضافه شد ✅')
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
  }

  transactions.value = [transaction, ...transactions.value]
  installments.value = installments.value.map((item) =>
    item.id === plan.id ? { ...item, paidCount: Math.min(item.paidCount + 1, item.totalCount) } : item,
  )
  pushToast('قسط پرداخت و هزینه ثبت شد ✅')
}

function removeInstallmentPlan(id: number) {
  installments.value = installments.value.filter((item) => item.id !== id)
  pushToast('قسط حذف شد')
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
  <h1>گزارش بودجه‌یار</h1>
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

async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const backup = JSON.parse(await file.text()) as unknown
    if (!isRecord(backup) || backup.app !== 'budgetyar') {
      pushToast('فایل بکاپ بودجه‌یار نیست')
      return
    }

    const summary = isRecord(backup.summary) ? backup.summary : {}
    transactions.value = restoreTransactions(backup.transactions)
    categories.value = restoreCategories(backup.categories)
    budgets.value = restoreBudgets(backup.budgets)
    installments.value = restoreInstallments(backup.installments)
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
    message: 'بکاپ بودجه‌یار آماده ذخیره شد ✅',
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
        text: 'خروجی بودجه‌یار',
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
    locale: 'fa-IR',
    plugins: {
      legend: {
        display: false,
        rtl: true,
        labels: {
          color: chartTextColor,
          font: { family: chartFontFamily },
        },
      },
      tooltip: {
        rtl: true,
        textDirection: 'rtl',
        backgroundColor: 'rgba(15, 23, 42, .94)',
        borderColor: 'rgba(255, 255, 255, .12)',
        borderWidth: 1,
        bodyColor: '#f8fafc',
        titleColor: chartTextColor,
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

function barOptions(): ChartOptions<'bar'> {
  return {
    ...baseChartOptions(),
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: chartGridColor },
        ticks: {
          color: chartMutedColor,
          font: { family: chartFontFamily },
          callback: (value) => formatCompact(Number(value)),
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: chartTextColor,
          font: { family: chartFontFamily },
        },
      },
    },
  }
}

function lineOptions(): ChartOptions<'line'> {
  return {
    ...baseChartOptions(),
    plugins: {
      ...baseChartOptions().plugins,
      legend: {
        display: true,
        rtl: true,
        position: 'bottom',
        labels: {
          color: chartTextColor,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          font: { family: chartFontFamily },
        },
      },
    },
    scales: {
      x: {
        grid: { color: chartGridColor },
        ticks: {
          color: chartMutedColor,
          font: { family: chartFontFamily },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartGridColor },
        ticks: {
          color: chartMutedColor,
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
        grid: { color: chartGridColor },
        ticks: {
          backdropColor: 'transparent',
          color: chartMutedColor,
          font: { family: chartFontFamily },
          callback: (value) => formatCompact(Number(value)),
        },
        pointLabels: {
          color: chartTextColor,
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
          color: chartTextColor,
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
        grid: { color: chartGridColor },
        ticks: {
          color: chartMutedColor,
          font: { family: chartFontFamily },
          callback: (value) => formatCompact(Number(value)),
        },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: chartTextColor,
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
          color: chartTextColor,
          font: { family: chartFontFamily },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartGridColor },
        ticks: {
          color: chartMutedColor,
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
}

function syncCharts() {
  if (activeSection.value !== 'داشبورد' && activeSection.value !== 'آمار') return

  createCharts()

  if (expenseShareChart.value) {
    expenseShareChart.value.data = expenseShareChartData.value
    expenseShareChart.value.update()
  }

  if (categoryBarChart.value) {
    categoryBarChart.value.data = categoryBarChartData.value
    categoryBarChart.value.update()
  }

  if (trendLineChart.value) {
    trendLineChart.value.data = trendLineChartData.value
    trendLineChart.value.update()
  }

  if (statsExpenseMixChart.value) {
    statsExpenseMixChart.value.data = statsExpenseMixChartData.value
    statsExpenseMixChart.value.update()
  }

  if (statsBudgetUsageChart.value) {
    statsBudgetUsageChart.value.data = statsBudgetUsageChartData.value
    statsBudgetUsageChart.value.update()
  }

  if (statsDailyExpenseChart.value) {
    statsDailyExpenseChart.value.data = statsDailyExpenseChartData.value
    statsDailyExpenseChart.value.update()
  }

  if (statsWeeklyFlowChart.value) {
    statsWeeklyFlowChart.value.data = statsWeeklyFlowChartData.value
    statsWeeklyFlowChart.value.update()
  }

  if (statsCashFlowChart.value) {
    statsCashFlowChart.value.data = statsCashFlowChartData.value
    statsCashFlowChart.value.update()
  }
}

function destroyCharts() {
  expenseShareChart.value?.destroy()
  categoryBarChart.value?.destroy()
  trendLineChart.value?.destroy()
  statsExpenseMixChart.value?.destroy()
  statsBudgetUsageChart.value?.destroy()
  statsDailyExpenseChart.value?.destroy()
  statsWeeklyFlowChart.value?.destroy()
  statsCashFlowChart.value?.destroy()
  expenseShareChart.value = null
  categoryBarChart.value = null
  trendLineChart.value = null
  statsExpenseMixChart.value = null
  statsBudgetUsageChart.value = null
  statsDailyExpenseChart.value = null
  statsWeeklyFlowChart.value = null
  statsCashFlowChart.value = null
}

export function useBudgetyar() {
  return {
    activeSection, isMobileMenuOpen, navItems, months, years, today, todayKey, currentMonthYear, currentJalaliDate, currentMonthLength,
    categories, transactions, budgets, installments, creditLimit, cashFlowMode,
    query, selectedMonth, selectedYear, selectedCategory, selectedType, dateRange, pickerDateRange,
    isModalOpen, formType, form, formAmountInWords, formDatePickerValue, editingId, toasts,
    categoryForm, installmentForm, installmentAmountInWords, installmentStartDatePickerValue,
    installPrompt, isStandalone, isAndroidNative, isNotificationsLoading, bankApps, bankSuggestions, selectedBankPackage, bankNotificationStatus,
    expenseShareCanvas, categoryBarCanvas, trendLineCanvas, statsExpenseMixCanvas, statsBudgetUsageCanvas, statsDailyExpenseCanvas, statsWeeklyFlowCanvas, statsCashFlowCanvas,
    currentMonthTransactions, currentWeekTransactions, expenseTransactions, incomeTransactions, weeklyExpenseTransactions, weeklyIncomeTransactions,
    totalIncome, totalExpense, creditExpense, creditRemaining, cashExpense, cashBeforeCreditPayment, balanceAfterCreditPayment, balanceAfterCommitments,
    loanedExpense, essentialExpense, nonEssentialExpense, weeklyIncome, weeklyExpense, weeklyCreditExpense, weeklyBalance, totalBudget, weeklyBudgetAllowance, balance, budgetUsage, savingsPercent,
    categoryTotals, weeklyCategoryBudgets, weeklyBudgetAnalysis, sortedCategoryTotals, visibleCategoryTotals, safeMaxCategory, highestExpense, lowestExpense, todayExpense, todayIncome, averageDailyExpense, latestExpenses, latestLoans,
    installmentSummaries, activeInstallmentSummaries, overdueInstallments, upcomingInstallments, dueInstallmentsThisMonth, monthlyInstallmentDue, commitmentInstallmentDue,
    filteredTransactions, dailyTrend, hasExpenseData, expenseShareChartData, categoryBarChartData, trendLineChartData, dailyExpensePoints, weeklyFlowPoints, budgetAnalysisItems, statsExpenseMixChartData, statsBudgetUsageChartData, statsDailyExpenseChartData, statsWeeklyFlowChartData, statsCashFlowChartData,
    summaryLines, insights, dashboardCards, widgets, statsItems,
    getCategory, normalizeDigits, normalizeJalaliDate, getJalaliInputDay, getTrendDays, getPreviousMonthPrefix, addJalaliMonths, getInstallmentDueDate, getInstallmentStatus, getInstallmentStatusLabel, getCurrentWeekRange, getWeekdayLabel, getJalaliMonthPrefix, getCurrentJalaliDate, formatJalaliInputDate, formatDisplayJalaliDate, jalaliInputToIso, isoToJalaliInput, toPersianNumber, parseMoneyInput, formatMoneyInput, formatMoneyWords, formatMoney, formatCompact, progressPercent, getChangePercent, formatPercentHint, formatChangeSentence,
    selectSection, openModal, editTransaction, saveTransaction, removeTransaction, refreshBankNotifications, openNotificationAccessSettings, updateSelectedBankPackage, acceptBankSuggestion, dismissBankSuggestion, formatSuggestionDate, updateBudget, addCategory, deleteCategory, addInstallmentPlan, payInstallment, removeInstallmentPlan,
    getTransactionCategoryLabel, getPaymentMethodLabel, getNecessityLabel, buildCsvReport, buildExcelReport, buildBackupJson, importBackup, createExportFile, saveBlobToDevice, exportReport, installApp, pushToast,
    createCharts, syncCharts, destroyCharts,
  }
}

let budgetyarStarted = false
export function startBudgetyar() {
  if (budgetyarStarted) return
  budgetyarStarted = true
  onMounted(() => {
    isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    isAndroidNative.value = Capacitor.getPlatform() === 'android'
  
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      installPrompt.value = event as InstallPromptEvent
    })
  
    window.addEventListener('appinstalled', () => {
      isStandalone.value = true
      installPrompt.value = null
      pushToast('بودجه‌یار نصب شد ✅')
    })
  
    const savedTransactions = localStorage.getItem(STORAGE_KEY)
    const savedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY)
    const savedBudgets = localStorage.getItem(BUDGETS_STORAGE_KEY)
    const savedCreditLimit = localStorage.getItem(CREDIT_STORAGE_KEY)
    const savedInstallments = localStorage.getItem(INSTALLMENTS_STORAGE_KEY)
  
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
  
    nextTick(syncCharts)
  })
  
  onBeforeUnmount(destroyCharts)
  
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
  
  watch(
    installments,
    (value) => {
      localStorage.setItem(INSTALLMENTS_STORAGE_KEY, JSON.stringify(value))
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
    ],
    () => {
      nextTick(syncCharts)
    },
    { deep: true },
  )
  
  watch(activeSection, (section) => {
    if (section === 'داشبورد' || section === 'آمار') {
      destroyCharts()
      nextTick(syncCharts)
      return
    }
  
    destroyCharts()
  })
}
