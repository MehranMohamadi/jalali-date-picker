<script setup lang="ts">
import '@fontsource-variable/vazirmatn'
import {
  Chart,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
  registerables,
} from 'chart.js'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { addJalaliDays, getJalaliMonthLength, parseJalaliInput, toGregorian, toJalali } from '../src/utils/jalali'

Chart.register(...registerables)
const BankNotifications = registerPlugin<BankNotificationsPlugin>('BankNotifications')

type TransactionType = 'income' | 'expense'
type PaymentMethod = 'cash' | 'credit'
type CashFlowMode = 'regular' | 'afterCredit' | 'afterCommitments'

type CategoryKey = string
type ExportFormat = 'PDF' | 'Excel' | 'CSV' | 'JSON'

interface Category {
  key: CategoryKey
  label: string
  icon: string
  color: string
}

interface Transaction {
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

interface BudgetGoal {
  category: CategoryKey
  budget: number
}

interface InstallmentPlan {
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
</script>

<template>
  <main dir="rtl" class="app-shell">
    <header class="mobile-topbar glass-panel">
      <button class="hamburger" type="button" :aria-expanded="isMobileMenuOpen" aria-label="منو" @click="isMobileMenuOpen = true">
        <span />
        <span />
        <span />
      </button>
      <div class="mobile-title">
        <strong>بودجه‌یار</strong>
        <small>{{ activeSection }}</small>
      </div>
      <!-- <button class="mobile-add" type="button" aria-label="ثبت هزینه" @click="openModal('expense')">＋</button> -->
    </header>

    <div v-if="isMobileMenuOpen" class="mobile-menu-backdrop" @click="isMobileMenuOpen = false" />

    <aside class="sidebar glass-panel" :class="{ open: isMobileMenuOpen }">
      <div class="brand">
        <span class="brand-mark">◈</span>
        <div>
          <strong>بودجه‌یار</strong>
          <small>مدیریت مالی شخصی</small>
        </div>
        <button class="drawer-close" type="button" aria-label="بستن منو" @click="isMobileMenuOpen = false">×</button>
      </div>

      <nav aria-label="ناوبری اصلی">
        <button
          v-for="item in navItems"
          :key="item"
          class="nav-item"
          :class="{ active: activeSection === item }"
          type="button"
          @click="selectSection(item)"
        >
          <span>{{ item }}</span>
        </button>
      </nav>
    </aside>

    <section class="content">
<!--       
      <header class="hero glass-panel" data-section="داشبورد">
        <div>
          <p class="eyebrow">{{ currentMonthYear }}</p>
          <h1>سلام مهران 👋</h1>
          <p>نمایی زنده از درآمد، هزینه، بودجه و مسیر پس‌انداز ماهانه شما.</p>
        </div>
        <div class="hero-actions">
          <button class="soft-button" type="button" @click="exportReport('PDF')">نسخه چاپی</button>
          <button v-if="!isStandalone" class="soft-button" type="button" @click="installApp">نصب اپ</button>
          <button class="soft-button" type="button" @click="openModal('income')">ثبت درآمد</button>
          <button class="primary-button" type="button" @click="openModal('expense')">ثبت هزینه</button>
        </div>
      </header> -->
<!-- 
      <section class="page-header glass-panel">
        <div>
          <p class="eyebrow">{{ currentMonthYear }}</p>
          <h1>{{ activeSection }}</h1>
        </div>
        <div class="hero-actions">
          <button v-if="activeSection === 'درآمدها'" class="primary-button" type="button" @click="openModal('income')">ثبت درآمد</button>
          <button v-if="activeSection === 'هزینه‌ها'" class="primary-button" type="button" @click="openModal('expense')">ثبت هزینه</button>
          <button v-if="activeSection === 'گزارش‌ها'" class="soft-button" type="button" @click="exportReport('PDF')">نسخه چاپی</button>
          <button v-if="activeSection === 'تنظیمات' && !isStandalone" class="soft-button" type="button" @click="installApp">نصب اپ</button>
        </div>
      </section> -->

      <section v-if="activeSection === 'داشبورد'" class="widgets-grid">
        <article v-for="widget in widgets" :key="widget.label" class="mini-card glass-panel">
          <small>{{ widget.label }}</small>
          <strong>{{ widget.value }}</strong>
        </article>
      </section>

      <section v-if="activeSection === 'داشبورد'" class="cards-grid">
        <article v-for="card in dashboardCards" :key="card.label" class="metric-card glass-panel" :class="card.className">
          <div class="metric-top">
            <small>{{ card.label }}</small>
          </div>
          <strong>
            <span class="counter">{{ card.suffix ? toPersianNumber(card.value) : formatMoney(card.value) }}</span>{{ card.suffix ?? '' }}
          </strong>
        </article>
      </section>


      <section v-if="activeSection === 'داشبورد'" class="recent-expenses-card glass-panel">
        <div class="section-title compact">
          <div>
            <h2>سه خرج آخر</h2>
          </div>
        </div>
        <div v-if="latestExpenses.length" class="recent-expenses-list">
          <div v-for="expense in latestExpenses" :key="expense.id" class="recent-expense-row">
            <div>
              <strong>{{ expense.title }}</strong>
              <span>{{ getCategory(expense.category).label }} · {{ expense.date }}</span>
            </div>
            <b>{{ formatCompact(expense.amount) }}</b>
          </div>
        </div>
        <p v-else class="empty-inline">هنوز خرجی ثبت نشده</p>
      </section>

      <section v-if="activeSection === 'داشبورد' && (upcomingInstallments.length || overdueInstallments.length)" class="installment-alert-card glass-panel">
        <div class="weekly-category-head">
          <strong>قسط‌های نزدیک</strong>
          <small>{{ toPersianNumber(overdueInstallments.length) }} عقب‌افتاده</small>
        </div>
        <div class="installment-alert-list">
          <span v-for="item in [...overdueInstallments, ...upcomingInstallments].slice(0, 4)" :key="item.id">
            <b>{{ item.title }}</b>
            <em>{{ item.nextDueDate }} · {{ formatCompact(item.amount) }}</em>
          </span>
        </div>
      </section>

      <section v-if="activeSection === 'داشبورد'" class="dashboard-grid">
        <article class="chart-card glass-panel">
          <div class="section-title">
            <div>
              <h2>سهم دسته‌های هزینه</h2>
              <p>نمایش سهم هر دسته از هزینه‌ها</p>
            </div>
          </div>
          <div class="pie-wrap">
            <div class="chart-canvas pie-chart" :class="{ empty: !hasExpenseData }">
              <canvas ref="expenseShareCanvas" aria-label="نمودار دایره‌ای هزینه‌ها" role="img" />
              <span v-if="!hasExpenseData">بدون داده</span>
            </div>
            <div class="legend">
              <span v-for="item in visibleCategoryTotals.slice(0, 7)" :key="item.key">
                <i :style="{ background: item.color }" />
                {{ item.icon }} {{ item.label }} · {{ formatCompact(item.spent) }}
              </span>
              <span v-if="!hasExpenseData">بعد از ثبت هزینه، سهم دسته‌ها نمایش داده می‌شود.</span>
            </div>
          </div>
        </article>

        <article class="chart-card glass-panel">
          <div class="section-title">
            <div>
              <h2>مقایسه هزینه دسته‌ها</h2>
              <p>نمودار ستونی بودجه مصرف‌شده</p>
            </div>
          </div>
          <div class="chart-canvas bar-chart">
            <canvas ref="categoryBarCanvas" aria-label="نمودار ستونی دسته‌های هزینه" role="img" />
          </div>
        </article>

        <article class="chart-card glass-panel wide">
          <div class="section-title">
            <div>
              <h2>روند خرج کردن و باقی مانده بودجه</h2>
              <p>نمودار خطی و ناحیه‌ای در طول ماه</p>
            </div>
          </div>
          <div class="chart-canvas line-chart">
            <canvas ref="trendLineCanvas" aria-label="نمودار روند ماهانه" role="img" />
          </div>
        </article>
      </section>

      <section v-if="activeSection === 'داشبورد'" class="weekly-category-budget glass-panel">
        <div class="weekly-category-head">
          <strong>بودجه هفتگی بخش‌ها</strong>
          <small>برای هر هفته</small>
        </div>
        <div class="weekly-category-list">
          <span v-for="item in weeklyCategoryBudgets" :key="item.key">
            <b>{{ item.icon }} {{ item.label }}</b>
            <em>{{ formatCompact(item.weeklyBudget) }}</em>
          </span>
        </div>
      </section>

      <section v-if="activeSection === 'گزارش‌ها' || activeSection === 'آمار'" class="dashboard-grid page-grid">
        <article v-if="activeSection === 'گزارش‌ها'" class="glass-panel summary-card" data-section="گزارش‌ها">
          <div class="section-title">
            <div>
              <h2>خلاصه ماهانه</h2>
              <p>به‌صورت خودکار از داده‌های همین ماه</p>
            </div>
          </div>
          <div class="weekly-overanalysis">
            <strong>خرج‌های مشکوک این هفته</strong>
            <div v-if="weeklyBudgetAnalysis.length" class="weekly-overanalysis-list">
              <span v-for="item in weeklyBudgetAnalysis" :key="item.key">
                <b>{{ item.icon }} {{ item.label }}</b>
                <em>{{ formatCompact(item.spentThisWeek) }} / {{ formatCompact(item.weeklyBudget) }}</em>
                <small>{{ item.overAmount ? `${formatCompact(item.overAmount)} بیشتر از بودجه هفتگی` : `${toPersianNumber(item.ratio)}٪ بودجه هفتگی مصرف شده` }}</small>
              </span>
            </div>
            <p v-else>این هفته هنوز هیچ دسته‌ای به محدوده خطر بودجه هفتگی نرسیده.</p>
          </div>
          <p v-for="line in summaryLines" :key="line">{{ line }}</p>
          <div class="insights">
            <strong>بینش‌های هوشمند</strong>
            <span v-for="insight in insights" :key="insight">{{ insight }}</span>
          </div>
        </article>

        <article v-if="activeSection === 'آمار'" class="glass-panel stats-card" data-section="آمار">
          <div class="section-title">
            <div>
              <h2>آمار</h2>
              <p>شاخص‌های کلیدی مالی</p>
            </div>
          </div>
          <div class="stats-grid">
            <div v-for="item in statsItems" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
          <div v-if="latestLoans.length" class="loan-summary-list">
            <strong>قرض‌های این ماه</strong>
            <span v-for="item in latestLoans" :key="item.id">
              <b>{{ item.loanPerson }}</b>
              <em>{{ item.title }} · {{ formatMoney(item.amount) }}</em>
            </span>
          </div>
          <div class="stats-analysis-grid">
            <section class="stats-chart-panel">
              <div class="section-title compact">
                <div>
                  <h2>ترکیب هزینه‌ها</h2>
                  <p>سهم نسبی دسته‌های پرمصرف</p>
                </div>
              </div>
              <div class="chart-canvas stats-polar-chart" :class="{ empty: !hasExpenseData }">
                <canvas ref="statsExpenseMixCanvas" aria-label="نمودار ترکیب هزینه‌ها" role="img" />
                <span v-if="!hasExpenseData">بدون داده</span>
              </div>
            </section>

            <section class="stats-chart-panel wide">
              <div class="section-title compact">
                <div>
                  <h2>مصرف بودجه دسته‌ها</h2>
                  <p>مصرف‌شده، مانده و عبور از سقف</p>
                </div>
              </div>
              <div class="chart-canvas stats-budget-chart">
                <canvas ref="statsBudgetUsageCanvas" aria-label="نمودار مصرف بودجه دسته‌ها" role="img" />
              </div>
            </section>

            <section class="stats-chart-panel wide">
              <div class="section-title compact">
                <div>
                  <h2>خرج روزانه</h2>
                  <p>نوسان هزینه در روزهای ماه</p>
                </div>
              </div>
              <div class="chart-canvas stats-line-chart">
                <canvas ref="statsDailyExpenseCanvas" aria-label="نمودار خرج روزانه" role="img" />
              </div>
            </section>

            <section class="stats-chart-panel wide">
              <div class="section-title compact">
                <div>
                  <h2>آمار هفتگی</h2>
                  <p>درآمد و هزینه روزهای هفته جاری</p>
                </div>
              </div>
              <div class="chart-canvas stats-weekly-chart">
                <canvas ref="statsWeeklyFlowCanvas" aria-label="نمودار آمار هفتگی" role="img" />
              </div>
            </section>

            <section class="stats-chart-panel">
              <div class="section-title compact">
                <div>
                  <h2>جریان پول</h2>
                  <p>{{ cashFlowMode === 'afterCommitments' ? 'پول کل منهای اعتبار و قسط' : cashFlowMode === 'afterCredit' ? 'پول کل منهای بدهی اعتبار' : 'درآمد، هزینه و پس‌انداز' }}</p>
                </div>
              </div>
              <div class="chart-toggle segmented compact-toggle">
                <button type="button" :class="{ active: cashFlowMode === 'regular' }" @click="cashFlowMode = 'regular'">معمولی</button>
                <button type="button" :class="{ active: cashFlowMode === 'afterCredit' }" @click="cashFlowMode = 'afterCredit'">بعد از اعتبار</button>
                <button type="button" :class="{ active: cashFlowMode === 'afterCommitments' }" @click="cashFlowMode = 'afterCommitments'">بعد از تعهدات</button>
              </div>
              <div class="chart-canvas stats-cash-chart">
                <canvas ref="statsCashFlowCanvas" aria-label="نمودار جریان پول" role="img" />
              </div>
            </section>
          </div>
        </article>
      </section>

      <section v-if="activeSection === 'بودجه‌ها'" class="glass-panel budgets-card" data-section="بودجه‌ها">
        <div class="section-title">
          <div>
            <h2>بودجه‌های دسته‌بندی</h2>
            <p>وقتی مصرف از بودجه بگذرد، هشدار قرمز نمایش داده می‌شود.</p>
          </div>
        </div>

        <form class="category-manager" @submit.prevent="addCategory">
          <label>
            <span>نام دسته</span>
            <input v-model="categoryForm.label" type="text" placeholder="مثلا قهوه" />
          </label>
          <label>
            <span>آیکن</span>
            <input v-model="categoryForm.icon" type="text" maxlength="3" placeholder="☕" />
          </label>
          <label>
            <span>بودجه</span>
            <input
              :value="formatMoneyInput(categoryForm.budget)"
              type="text"
              inputmode="numeric"
              @input="updateMoneyInput(categoryForm, 'budget', $event)"
            />
          </label>
          <button class="primary-button" type="submit">افزودن دسته</button>
        </form>

        <div class="budget-grid">
          <article v-for="item in categoryTotals" :key="item.key" class="budget-item">
            <div>
              <strong>{{ item.icon }} {{ item.label }}</strong>
              <button v-if="item.key !== 'other'" class="delete-category" type="button" @click="deleteCategory(item.key)">حذف</button>
            </div>
            <span>بودجه: {{ formatMoney(item.budget) }}</span>
            <label class="budget-edit">
              <span>ویرایش بودجه</span>
              <input :value="formatMoneyInput(item.budget)" type="text" inputmode="numeric" @change="updateBudget(item.key, $event)" />
            </label>
            <div class="progress" :class="{ danger: item.spent > item.budget }">
              <i :style="{ width: `${progressPercent(item.spent, item.budget)}%` }" />
            </div>
            <small>مصرف: {{ formatMoney(item.spent) }}</small>
            <em v-if="item.spent > item.budget">⚠️ از بودجه این بخش عبور کرده‌اید.</em>
          </article>
        </div>
      </section>

      <section v-if="activeSection === 'قسط‌ها'" class="glass-panel installments-card" data-section="قسط‌ها">
        <div class="section-title">
          <div>
            <h2>قسط‌ها</h2>
            <p>قسط‌های ماهانه، سررسیدها و پرداخت‌های ثبت‌شده</p>
          </div>
        </div>

        <form class="installment-form" @submit.prevent="addInstallmentPlan">
          <label>
            <span>عنوان</span>
            <input v-model="installmentForm.title" type="text" placeholder="مثلا وام لپ‌تاپ" required />
          </label>
          <label>
            <span>مبلغ هر قسط</span>
            <input :value="formatMoneyInput(installmentForm.amount)" type="text" inputmode="numeric" required @input="updateMoneyInput(installmentForm, 'amount', $event)" />
            <small v-if="installmentAmountInWords" class="amount-in-words">{{ installmentAmountInWords }}</small>
          </label>
          <label>
            <span>دسته</span>
            <select v-model="installmentForm.category">
              <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
            </select>
          </label>
          <label>
            <span>تاریخ شروع</span>
            <JalaliDatePicker
              v-model="installmentStartDatePickerValue"
              class="date-picker-field"
              placeholder="شروع اقساط"
              :clearable="false"
              popover-class="date-picker-popover"
            />
          </label>
          <label>
            <span>روز سررسید</span>
            <input v-model.number="installmentForm.dueDay" type="number" min="1" max="31" required />
          </label>
          <label>
            <span>تعداد اقساط</span>
            <input v-model.number="installmentForm.totalCount" type="number" min="1" required />
          </label>
          <label>
            <span>روش پرداخت</span>
            <select v-model="installmentForm.paymentMethod">
              <option value="cash">نقدی</option>
              <option value="credit">اعتباری</option>
            </select>
          </label>
          <label class="installment-description">
            <span>توضیحات</span>
            <textarea v-model="installmentForm.description" rows="2" placeholder="اختیاری" />
          </label>
          <button class="primary-button" type="submit">افزودن قسط</button>
        </form>

        <div v-if="installmentSummaries.length" class="installments-grid">
          <article v-for="item in installmentSummaries" :key="item.id" class="installment-item" :class="item.status">
            <div class="installment-item-head">
              <div>
                <strong>{{ item.title }}</strong>
                <small>{{ getCategory(item.category).icon }} {{ getCategory(item.category).label }} · {{ getPaymentMethodLabel({ ...item, type: 'expense', date: item.startDate }) }}</small>
              </div>
              <span>{{ item.statusLabel }}</span>
            </div>
            <div class="installment-meta">
              <span>مبلغ: {{ formatMoney(item.amount) }}</span>
              <span>سررسید بعدی: {{ item.nextDueDate || 'تمام شده' }}</span>
              <span>{{ toPersianNumber(item.paidCount) }} از {{ toPersianNumber(item.totalCount) }} پرداخت شده</span>
            </div>
            <div class="progress" :class="{ danger: item.status === 'overdue' }">
              <i :style="{ width: `${progressPercent(item.paidCount, item.totalCount)}%` }" />
            </div>
            <p v-if="item.description">{{ item.description }}</p>
            <div class="installment-actions">
              <button class="primary-button" type="button" :disabled="item.status === 'completed'" @click="payInstallment(item)">پرداخت شد</button>
              <button class="soft-button" type="button" @click="removeInstallmentPlan(item.id)">حذف</button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state compact-empty">
          <div>◇</div>
          <strong>هنوز قسطی ثبت نشده است.</strong>
          <span>اولین قسط ماهانه را از فرم بالا اضافه کنید.</span>
        </div>
      </section>

      <section v-if="activeSection === 'درآمدها' || activeSection === 'هزینه‌ها'" class="glass-panel table-card" data-section="تراکنش‌ها">
        <div class="section-title">
          <div>
            <h2>تراکنش‌های اخیر</h2>
            <p>جستجو و فیلترها به‌صورت زنده اعمال می‌شوند.</p>
          </div>
        </div>

        <div class="filters">
          <input v-model="query" type="search" placeholder="جستجو" aria-label="جستجو" />
          <select v-model="selectedMonth" aria-label="ماه">
            <option v-for="month in months" :key="month">{{ month }}</option>
          </select>
          <select v-model="selectedYear" aria-label="سال">
            <option v-for="year in years" :key="year">{{ year }}</option>
          </select>
          <select v-model="selectedCategory" aria-label="دسته">
            <option>همه</option>
            <option v-for="category in categories" :key="category.key">{{ category.label }}</option>
          </select>
          <select v-model="selectedType" aria-label="نوع تراکنش">
            <option>همه</option>
            <option>درآمد</option>
            <option>هزینه</option>
          </select>
          <JalaliRangeDatePicker
            v-model="pickerDateRange"
            class="date-range-filter"
            placeholder="از تاریخ تا تاریخ"
            popover-class="date-picker-popover"
          />
        </div>

        <div v-if="filteredTransactions.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>نوع</th>
                <th>عنوان</th>
                <th>دسته</th>
                <th>تاریخ</th>
                <th>مبلغ</th>
                <th>جزئیات</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredTransactions" :key="item.id">
                <td><span class="pill" :class="item.type">{{ item.type === 'income' ? 'درآمد' : 'هزینه' }}</span></td>
                <td>{{ item.title }}</td>
                <td>{{ item.type === 'income' ? 'درآمد' : `${getCategory(item.category).icon} ${getCategory(item.category).label}` }}</td>
                <td>{{ item.date }}</td>
                <td>{{ formatMoney(item.amount) }}</td>
                <td>
                  <div v-if="item.type === 'expense'" class="transaction-meta">
                    <span>{{ getPaymentMethodLabel(item) }}</span>
                    <span>{{ getNecessityLabel(item) }}</span>
                    <span v-if="item.isLoan">قرض: {{ item.loanPerson }}</span>
                  </div>
                  <span v-else>-</span>
                </td>
                <td class="actions">
                  <button type="button" @click="editTransaction(item)">ویرایش</button>
                  <button type="button" @click="removeTransaction(item.id)">حذف</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          <div>◇</div>
          <strong>هنوز هیچ هزینه‌ای ثبت نشده است.</strong>
          <span>با دکمه ثبت هزینه یا ثبت درآمد، اولین تراکنش را اضافه کنید.</span>
        </div>
      </section>

      <section v-if="activeSection === 'گزارش‌ها'" class="glass-panel reports-card" data-section="گزارش‌ها">
        <div class="section-title">
          <div>
            <h2>گزارش‌ها</h2>
            <p>گزارش ماهانه، سالانه، دسته‌بندی، پس‌انداز و نسخه قابل چاپ</p>
          </div>
          <div class="export-actions">
            <button type="button" @click="exportReport('PDF')">چاپی</button>
            <button type="button" @click="exportReport('Excel')">Excel</button>
            <button type="button" @click="exportReport('CSV')">CSV</button>
          </div>
        </div>
        <div class="report-grid">
          <span>گزارش ماهانه · {{ formatMoney(totalExpense) }}</span>
          <span>پرداخت اعتبار · {{ formatMoney(creditExpense) }}</span>
          <span>قسط‌های این ماه · {{ formatMoney(monthlyInstallmentDue) }}</span>
          <span>مانده تعهدات · {{ formatMoney(balanceAfterCommitments) }}</span>
          <span>خرج ضروری · {{ formatMoney(essentialExpense) }}</span>
          <span>خرج غیرضروری · {{ formatMoney(nonEssentialExpense) }}</span>
          <span>گزارش سالانه · روند هزینه کنترل‌شده</span>
          <span>گزارش دسته‌بندی · {{ safeMaxCategory.label }} در صدر</span>
          <span>گزارش پس‌انداز · {{ formatMoney(balance) }}</span>
        </div>
      </section>

      <section v-if="activeSection === 'اعلان‌ها'" class="glass-panel notifications-card" data-section="اعلان‌ها">
        <div class="section-title">
          <div>
            <h2>اعلان‌ها</h2>
            <p>پیشنهاد ثبت هزینه از اعلان‌های بلو بانک</p>
          </div>
          <button class="soft-button" type="button" :disabled="!isAndroidNative || isNotificationsLoading" @click="refreshBankNotifications(true)">
            تازه‌سازی
          </button>
        </div>

        <div v-if="!isAndroidNative" class="empty-state">
          <div>◇</div>
          <strong>خواندن اعلان‌ها فقط در نسخه Android Native فعال است.</strong>
          <span>نسخه PWA و مرورگر به اعلان‌های اپ‌های دیگر گوشی دسترسی ندارند.</span>
        </div>

        <div v-else class="notification-panel">
          <div class="notification-status-grid">
            <article class="notification-status">
              <small>دسترسی اعلان</small>
              <strong>{{ bankNotificationStatus.isEnabled ? 'فعال' : 'غیرفعال' }}</strong>
              <button class="soft-button" type="button" @click="openNotificationAccessSettings">
                تنظیم دسترسی
              </button>
            </article>
            <label class="notification-status">
              <small>اپ منبع</small>
              <select :value="selectedBankPackage" @change="updateSelectedBankPackage">
                <option value="">انتخاب بلو بانک</option>
                <option v-for="app in bankApps" :key="app.packageName" :value="app.packageName">
                  {{ app.label }}
                </option>
              </select>
            </label>
          </div>

          <div v-if="bankSuggestions.length" class="notification-list">
            <article v-for="suggestion in bankSuggestions" :key="suggestion.id" class="notification-suggestion">
              <div>
                <small>{{ suggestion.sourceApp }} · {{ formatSuggestionDate(suggestion.postTime) }}</small>
                <strong>{{ suggestion.title }}</strong>
                <span>{{ getCategory(suggestion.category).icon }} {{ getCategory(suggestion.category).label }} · {{ formatMoney(suggestion.amount) }}</span>
              </div>
              <div class="notification-actions">
                <button class="primary-button" type="button" @click="acceptBankSuggestion(suggestion)">ثبت هزینه</button>
                <button class="soft-button" type="button" @click="dismissBankSuggestion(suggestion.id)">رد</button>
              </div>
            </article>
          </div>

          <div v-else class="empty-state compact-empty">
            <div>◇</div>
            <strong>پیشنهاد تازه‌ای ندارید.</strong>
            <span>بعد از فعال‌سازی دسترسی و انتخاب بلو بانک، اعلان‌های هزینه اینجا می‌آیند.</span>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'تنظیمات'" class="glass-panel settings-card" data-section="تنظیمات">
        <div class="section-title">
          <div>
            <h2>تنظیمات</h2>
            <p>ارز، زبان و پوسته برنامه</p>
          </div>
        </div>
        <div class="settings-grid">
          <label>سقف اعتبار
            <input :value="formatMoneyInput(creditLimit)" type="text" inputmode="numeric" @input="updateCreditLimit" />
          </label>
          <label>پرداخت آخر ماه
            <input :value="formatMoneyInput(creditExpense)" type="text" readonly />
          </label>
          <label>اعتبار باقی‌مانده
            <input :value="formatMoneyInput(creditRemaining)" type="text" readonly />
          </label>
          <label>ارز <select><option>تومان</option><option>ریال</option></select></label>
          <label>پوسته <select><option>فقط تاریک</option></select></label>
          <label>زبان <select><option>فارسی</option></select></label>
          <button class="primary-button pwa-install" type="button" @click="exportReport('JSON')">ذخیره بکاپ در فایل‌ها</button>
          <button v-if="!isStandalone" class="primary-button pwa-install" type="button" @click="installApp">نصب نسخه PWA</button>
        </div>
      </section>
    </section>

    <button class="fab" type="button" aria-label="ثبت سریع" @click="openModal('expense')">＋</button>

    <Transition name="modal">
      <div v-if="isModalOpen" class="modal-backdrop" @click.self="isModalOpen = false">
        <form class="modal glass-panel" @submit.prevent="saveTransaction">
          <div class="section-title">
            <div>
              <!-- <h2>{{ editingId ? 'ویرایش تراکنش' : 'ثبت تراکنش' }}</h2> -->
            </div>
            <!-- <button class="close" type="button" @click="isModalOpen = false">×</button> -->
          </div>
          <div class="segmented">
            <button type="button" :class="{ active: formType === 'expense' }" @click="formType = 'expense'">ثبت هزینه</button>
            <button type="button" :class="{ active: formType === 'income' }" @click="formType = 'income'">ثبت درآمد</button>
          </div>
          <label class="amount-field">
            مبلغ
            <input :value="formatMoneyInput(form.amount)" type="text" inputmode="numeric" required @input="updateMoneyInput(form, 'amount', $event)" />
            <small v-if="formAmountInWords" class="amount-in-words">{{ formAmountInWords }}</small>
          </label>
          <label>عنوان <input v-model="form.title" type="text" required /></label>
          <label v-if="formType === 'expense'">دسته بندی
            <select v-model="form.category">
              <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
            </select>
          </label>
          <div v-if="formType === 'expense'" class="form-inline-grid">
            <label>روش پرداخت
              <select v-model="form.paymentMethod">
                <option value="cash">نقدی</option>
                <option value="credit">اعتباری</option>
              </select>
            </label>
            <label>نوع خرید
              <select v-model="form.isEssential">
                <option :value="true">ضروری</option>
                <option :value="false">غیرضروری</option>
              </select>
            </label>
          </div>
          <label v-if="formType === 'expense'" class="check-row">
            <input v-model="form.isLoan" type="checkbox" />
            پولی که قرض دادم
          </label>
          <label v-if="formType === 'expense' && form.isLoan">نام شخص
            <input v-model="form.loanPerson" type="text" placeholder="مثلا علی" />
          </label>
          <label>تاریخ
            <JalaliDatePicker
              v-model="formDatePickerValue"
              class="date-picker-field"
              placeholder="انتخاب تاریخ"
              :clearable="false"
              popover-class="date-picker-popover"
            />
          </label>
          <label>توضیحات <textarea v-model="form.description" rows="3" placeholder="اختیاری" /></label>
          <button class="primary-button full" type="submit">{{ formType === 'expense' ? 'ثبت هزینه' : 'ثبت درآمد' }}</button>
        </form>
      </div>
    </Transition>

    <div class="toast-stack" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="toast in toasts" :key="toast.id" class="toast glass-panel">{{ toast.text }}</div>
      </TransitionGroup>
    </div>
  </main>
</template>

<style>
:root {
  color-scheme: dark;
  font-family: 'Vazirmatn Variable', Vazirmatn, Tahoma, sans-serif;
  background: #050816;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  max-width: 100%;
  overflow-x: hidden;
  font-size: .94rem;
  background:
    radial-gradient(circle at 18% 12%, rgba(34, 211, 238, .26), transparent 28%),
    radial-gradient(circle at 82% 8%, rgba(124, 58, 237, .32), transparent 26%),
    linear-gradient(135deg, #050816 0%, #0b1024 42%, #111827 100%);
  color: #f8fafc;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: 100vh;
  gap: 24px;
  padding: 24px;
  overflow-x: hidden;
}

.mobile-topbar,
.mobile-menu-backdrop,
.drawer-close {
  display: none;
}

.glass-panel {
  border: 1px solid rgba(255, 255, 255, .11);
  background: linear-gradient(145deg, rgba(15, 23, 42, .78), rgba(17, 24, 39, .46));
  box-shadow: 0 24px 80px rgba(2, 8, 23, .42), inset 0 1px 0 rgba(255, 255, 255, .08);
  backdrop-filter: blur(24px);
}

.sidebar {
  position: sticky;
  top: 24px;
  height: calc(100vh - 48px);
  border-radius: 24px;
  padding: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.brand-mark {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #22d3ee, #7c3aed 55%, #ec4899);
  box-shadow: 0 0 34px rgba(34, 211, 238, .42);
}

.brand strong,
.metric-card strong {
  display: block;
}

.brand small,
.section-title p,
.metric-card p,
.mini-card small,
.budget-item span,
.budget-item small,
.summary-card p,
.settings-card p,
.notification-status small,
.notification-suggestion small,
.notification-suggestion span {
  color: #94a3b8;
}

.nav-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  border: 0;
  border-radius: 16px;
  padding: 13px 14px;
  background: transparent;
  color: #cbd5e1;
  transition: .25s ease;
}

.nav-item:hover,
.nav-item.active {
  background: linear-gradient(135deg, rgba(34, 211, 238, .18), rgba(124, 58, 237, .2));
  color: white;
  box-shadow: 0 0 28px rgba(124, 58, 237, .18);
}

.content {
  display: grid;
  gap: 20px;
  min-width: 0;
}

.page-grid {
  grid-template-columns: minmax(0, 1fr);
}

.hero,
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-radius: 24px;
  padding: 28px;
}

.eyebrow {
  color: #22d3ee;
  font-weight: 800;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  margin: 6px 0 10px;
  font-size: clamp(2rem, 4vw, 4.2rem);
  letter-spacing: 0;
}

h2 {
  font-size: 1.1rem;
}

.hero-actions,
.export-actions,
.actions,
.segmented {
  display: flex;
  gap: 10px;
}

.primary-button,
.soft-button,
.export-actions button,
.actions button,
.segmented button {
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 14px;
  padding: 11px 16px;
  color: white;
  background: rgba(255, 255, 255, .08);
}

.primary-button,
.segmented .active {
  border: 0;
  background: linear-gradient(135deg, #06b6d4, #2563eb 48%, #7c3aed);
  box-shadow: 0 0 30px rgba(37, 99, 235, .34);
}

.full {
  width: 100%;
}

.widgets-grid,
.cards-grid,
.budget-grid,
.report-grid,
.settings-grid {
  display: grid;
  gap: 16px;
}

.widgets-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.cards-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.mini-card,
.metric-card,
.chart-card,
.summary-card,
.stats-card,
.budgets-card,
.table-card,
.reports-card,
.notifications-card,
.settings-card {
  border-radius: 22px;
  padding: 20px;
}

.mini-card {
  display: flex;
  min-width: 0;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  transition: transform .25s ease;
}

.mini-card:hover,
.budget-item:hover {
  transform: translateY(-4px);
}

.mini-card span {
  font-size: 1.4rem;
}

.mini-card strong {
  display: block;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .95rem;
  line-height: 1.25;
  text-align: left;
  white-space: nowrap;
}

.metric-card {
  position: relative;
  overflow: hidden;
  display: flex;
  min-width: 0;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  transition: .25s ease;
}

.metric-card::after {
  display: none;
}

.card-cyan::after { background: #22d3ee; }
.card-violet::after { background: #8b5cf6; }
.card-blue::after { background: #2563eb; }
.card-pink::after { background: #ec4899; }

.metric-top,
.section-title,
.budget-item > div:first-child {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.metric-top,
.metric-top small,
.mini-card small {
  min-width: 0;
}

.metric-top small,
.mini-card small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-title.compact {
  margin-bottom: 12px;
}

.section-title.compact h2 {
  font-size: 1rem;
}

.section-title.compact p {
  font-size: .84rem;
}

.metric-top span {
  font-size: 1.8rem;
  animation: float 3s ease-in-out infinite;
}

.metric-card strong {
  min-width: 0;
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: clamp(1rem, 1.45vw, 1.22rem);
  line-height: 1.25;
  text-align: left;
  white-space: nowrap;
  overflow-wrap: anywhere;
}

.weekly-budget-line {
  display: flex;
  min-height: 46px;
  align-items: center;
  gap: 12px;
  border-radius: 18px;
  padding: 10px 12px;
}

.weekly-budget-line span,
.weekly-budget-line small {
  min-width: 0;
  color: #94a3b8;
}

.weekly-budget-line strong {
  margin-inline-start: auto;
  color: #facc15;
  font-size: 1rem;
  white-space: nowrap;
}

.weekly-budget-line small {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .78rem;
  white-space: nowrap;
}

.recent-expenses-card {
  border-radius: 18px;
  padding: 10px 12px;
}

.recent-expenses-list {
  display: grid;
  gap: 8px;
}

.recent-expense-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, .08);
  padding-top: 6px;
}

.recent-expense-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.recent-expense-row div {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.recent-expense-row strong,
.recent-expense-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-expense-row strong {
  font-size: .9rem;
}

.recent-expense-row span,
.empty-inline {
  color: #94a3b8;
  font-size: .78rem;
}

.recent-expense-row b {
  flex: 0 0 auto;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fda4af;
  font-size: .86rem;
}

.installment-alert-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px 14px;
  border-radius: 18px;
  padding: 10px 12px;
}

.installment-alert-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 6px;
  min-width: 0;
}

.installment-alert-list span {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 12px;
  padding: 7px 9px;
  background: rgba(255, 255, 255, .04);
}

.installment-alert-list b,
.installment-alert-list em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.installment-alert-list b {
  font-size: .82rem;
}

.installment-alert-list em {
  color: #facc15;
  font-size: .76rem;
  font-style: normal;
}

.weekly-category-budget {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 10px 14px;
  border-radius: 18px;
  padding: 10px 12px;
}

.weekly-category-head {
  display: grid;
  gap: 2px;
  white-space: nowrap;
}

.weekly-category-head strong {
  font-size: .9rem;
}

.weekly-category-head small {
  color: #94a3b8;
  font-size: .72rem;
}

.weekly-category-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(124px, 1fr));
  gap: 6px;
  min-width: 0;
}

.weekly-category-list span {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 10px;
  padding: 5px 7px;
  background: rgba(255, 255, 255, .035);
}

.weekly-category-list b,
.weekly-category-list em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weekly-category-list b {
  min-width: 0;
  color: #dbeafe;
  font-size: .76rem;
  font-style: normal;
  font-weight: 700;
}

.weekly-category-list em {
  flex: 0 0 auto;
  color: #facc15;
  font-size: .72rem;
  font-style: normal;
}

.counter {
  animation: countPop .9s ease both;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.wide {
  grid-column: 1 / -1;
}

.pie-wrap {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 18px;
  align-items: center;
  min-height: 260px;
}

.chart-canvas {
  position: relative;
  width: 100%;
  min-height: 260px;
}

.chart-canvas canvas {
  width: 100% !important;
  height: 100% !important;
}

.pie-chart {
  width: 220px;
  height: 220px;
  min-height: 220px;
  filter: drop-shadow(0 0 22px rgba(34, 211, 238, .22));
}

.pie-chart.empty canvas {
  opacity: .5;
}

.pie-chart > span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #94a3b8;
  font-weight: 800;
}

.legend {
  display: grid;
  gap: 10px;
}

.legend span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
}

.legend i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.bar-chart {
  height: 320px;
  margin-top: 20px;
}

.progress {
  height: 11px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, .08);
}

.progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  animation: grow 1s ease both;
}

.line-chart {
  height: 280px;
  margin-top: 14px;
}

.summary-card,
.stats-card {
  min-height: 340px;
}

.summary-card > p {
  margin-top: 16px;
  line-height: 2;
}

.weekly-overanalysis {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  border: 1px solid rgba(250, 204, 21, .16);
  border-radius: 14px;
  padding: 10px;
  background: rgba(250, 204, 21, .06);
}

.weekly-overanalysis > strong {
  color: #fde68a;
  font-size: .9rem;
}

.weekly-overanalysis > p {
  color: #cbd5e1;
  font-size: .8rem;
  line-height: 1.7;
}

.weekly-overanalysis-list {
  display: grid;
  gap: 6px;
}

.weekly-overanalysis-list span {
  display: grid;
  grid-template-columns: minmax(90px, 1fr) auto minmax(120px, 1.2fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  border-top: 1px solid rgba(255, 255, 255, .08);
  padding-top: 6px;
}

.weekly-overanalysis-list span:first-child {
  border-top: 0;
  padding-top: 0;
}

.weekly-overanalysis-list b,
.weekly-overanalysis-list em,
.weekly-overanalysis-list small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weekly-overanalysis-list b {
  min-width: 0;
  font-size: .82rem;
}

.weekly-overanalysis-list em {
  color: #facc15;
  font-size: .78rem;
  font-style: normal;
}

.weekly-overanalysis-list small {
  color: #fca5a5;
  font-size: .75rem;
}

.insights,
.stats-grid,
.budget-grid,
.report-grid,
.settings-grid {
  margin-top: 18px;
}

.insights {
  display: grid;
  gap: 10px;
  border-radius: 18px;
  padding: 16px;
  background: rgba(34, 211, 238, .08);
}

.insights span,
.report-grid span {
  color: #dbeafe;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stats-analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.stats-chart-panel {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, .045);
}

.stats-chart-panel.wide {
  grid-column: 1 / -1;
}

.stats-polar-chart,
.stats-cash-chart {
  min-height: 260px;
  height: 260px;
}

.stats-budget-chart,
.stats-line-chart,
.stats-weekly-chart {
  min-height: 310px;
  height: 310px;
}

.stats-polar-chart.empty canvas {
  opacity: .42;
}

.stats-polar-chart > span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #94a3b8;
  font-weight: 800;
}

.chart-toggle {
  margin: 10px 0 12px;
}

.compact-toggle button {
  flex: 1;
  min-height: 38px;
  padding: 8px 10px;
  font-size: .86rem;
}

.stats-grid div,
.budget-item,
.report-grid span,
.settings-grid label {
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, .045);
}

.stats-grid span {
  display: block;
  margin-bottom: 8px;
  color: #94a3b8;
}

.budget-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.category-manager {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) 86px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
  margin-top: 18px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, .045);
}

.category-manager label {
  display: grid;
  gap: 7px;
}

.category-manager span {
  color: #94a3b8;
  font-size: .82rem;
}

.budget-item {
  display: grid;
  gap: 10px;
  transition: .25s ease;
}

.delete-category {
  border: 1px solid rgba(248, 113, 113, .25);
  border-radius: 12px;
  padding: 7px 10px;
  background: rgba(248, 113, 113, .1);
  color: #fca5a5;
}

.progress i {
  background: linear-gradient(90deg, #22d3ee, #7c3aed);
}

.progress.danger i {
  background: linear-gradient(90deg, #fb7185, #ef4444);
}

.budget-item em {
  color: #fca5a5;
  font-style: normal;
}

.budget-edit {
  display: grid;
  gap: 6px;
}

.budget-edit span {
  color: #94a3b8;
  font-size: .82rem;
}

.budget-edit input {
  min-height: 38px;
  padding: 9px 11px;
}

.installment-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
  margin-top: 18px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, .045);
}

.installment-form label,
.installment-item {
  display: grid;
  gap: 8px;
}

.installment-form span {
  color: #94a3b8;
  font-size: .82rem;
}

.installment-description {
  grid-column: span 3;
}

.installment-form button {
  min-height: 46px;
  align-self: end;
}

.installments-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.installment-item {
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, .045);
}

.installment-item.overdue {
  border-color: rgba(248, 113, 113, .34);
}

.installment-item.upcoming {
  border-color: rgba(250, 204, 21, .32);
}

.installment-item.completed {
  opacity: .68;
}

.installment-item-head,
.installment-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.installment-item-head div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.installment-item-head strong,
.installment-item-head small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.installment-item-head small,
.installment-meta,
.installment-item p {
  color: #94a3b8;
  font-size: .82rem;
}

.installment-item-head > span {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(34, 211, 238, .12);
  color: #67e8f9;
  font-size: .76rem;
}

.installment-item.overdue .installment-item-head > span {
  background: rgba(248, 113, 113, .14);
  color: #fca5a5;
}

.installment-item.upcoming .installment-item-head > span {
  background: rgba(250, 204, 21, .14);
  color: #fde68a;
}

.installment-meta {
  display: grid;
  gap: 4px;
}

.installment-actions button {
  flex: 1;
  padding: 9px 10px;
}

.filters {
  display: grid;
  grid-template-columns: 1.6fr repeat(4, 1fr) 2fr;
  gap: 10px;
  margin: 18px 0;
}

.date-range-filter,
.date-picker-field {
  width: 100%;
  max-width: none;
}

.date-picker-popover {
  min-width: min(18rem, calc(100vw - 32px));
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 14px;
  outline: 0;
  padding: 12px 13px;
  background: rgba(2, 6, 23, .45);
  color: #f8fafc;
}

textarea {
  resize: vertical;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid rgba(255, 255, 255, .08);
  padding: 14px 10px;
  text-align: right;
}

th {
  color: #94a3b8;
  font-weight: 600;
}

.pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 5px 11px;
}

.pill.income {
  background: rgba(34, 197, 94, .16);
  color: #86efac;
}

.pill.expense {
  background: rgba(244, 63, 94, .16);
  color: #fda4af;
}

.actions button {
  padding: 8px 11px;
}

.transaction-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.transaction-meta span {
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, .045);
  color: #cbd5e1;
  font-size: .78rem;
  white-space: nowrap;
}

.loan-summary-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.loan-summary-list > strong {
  grid-column: 1 / -1;
  color: #e2e8f0;
}

.loan-summary-list span {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 14px;
  padding: 10px;
  background: rgba(255, 255, 255, .045);
}

.loan-summary-list em {
  color: #94a3b8;
  font-style: normal;
  font-size: .84rem;
}

.empty-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  text-align: center;
  color: #94a3b8;
}

.empty-state div {
  font-size: 4rem;
  color: #22d3ee;
  text-shadow: 0 0 24px rgba(34, 211, 238, .5);
}

.report-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.notification-panel,
.notification-list {
  display: grid;
  gap: 14px;
}

.notification-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.notification-status,
.notification-suggestion {
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 18px;
  background: rgba(15, 23, 42, .54);
}

.notification-status {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.notification-status strong {
  font-size: 1.05rem;
}

.notification-status select {
  min-width: 0;
}

.notification-suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
}

.notification-suggestion div:first-child {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.notification-suggestion strong,
.notification-suggestion span {
  overflow-wrap: anywhere;
}

.notification-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.notification-actions button {
  padding: 9px 12px;
}

.compact-empty {
  min-height: 150px;
}

.settings-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.settings-grid label {
  display: grid;
  gap: 10px;
}

.pwa-install {
  min-height: 100%;
}

.fab {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 20;
  display: grid;
  width: 68px;
  height: 68px;
  place-items: center;
  border: 0;
  border-radius: 24px;
  background: linear-gradient(135deg, #22d3ee, #2563eb, #7c3aed);
  color: white;
  box-shadow: 0 0 50px rgba(34, 211, 238, .44);
  font-size: 2rem;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(2, 6, 23, .68);
  backdrop-filter: blur(14px);
}

.modal {
  width: min(520px, 100%);
  border-radius: 24px;
  padding: 22px;
}

.modal label {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  color: #cbd5e1;
}

.form-inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.check-row {
  display: flex !important;
  grid-template-columns: none !important;
  align-items: center;
  gap: 10px !important;
}

.check-row input {
  width: 18px;
  height: 18px;
  accent-color: #22d3ee;
}

.amount-in-words {
  color: #67e8f9;
  font-size: .82rem;
  line-height: 1.8;
}

.close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, .08);
  color: white;
  font-size: 1.3rem;
}

.toast-stack {
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 40;
  display: grid;
  gap: 10px;
}

.toast {
  border-radius: 16px;
  padding: 13px 16px;
  color: white;
}

.modal-enter-active,
.modal-leave-active,
.toast-enter-active,
.toast-leave-active {
  transition: .25s ease;
}

.modal-enter-from,
.modal-leave-to,
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(.98);
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes grow {
  from { width: 0; }
}

@keyframes countPop {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1180px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    height: auto;
  }

  .sidebar nav {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .nav-item {
    justify-content: center;
    margin: 0;
  }

  .cards-grid,
  .widgets-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters,
  .budget-grid,
  .report-grid,
  .installments-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .installment-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .installment-description {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .app-shell {
    padding: 12px;
    gap: 14px;
  }

  .hero,
  .page-header,
  .section-title,
  .metric-top {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-actions,
  .export-actions {
    flex-wrap: wrap;
  }

  .sidebar nav,
  .cards-grid,
  .widgets-grid,
  .dashboard-grid,
  .filters,
  .budget-grid,
  .report-grid,
  .settings-grid,
  .installment-form,
  .installments-grid,
  .installment-alert-card,
  .stats-grid,
  .stats-analysis-grid,
  .pie-wrap {
    grid-template-columns: 1fr;
  }

  .installment-description {
    grid-column: auto;
  }

  .pie-chart {
    justify-self: center;
  }

  .fab {
    right: 16px;
    bottom: 16px;
  }
}

@media (max-width: 760px) {
  body {
    background:
      radial-gradient(circle at 50% -10%, rgba(34, 211, 238, .22), transparent 34%),
      linear-gradient(180deg, #050816 0%, #0b1024 52%, #101827 100%);
  }

  .app-shell {
    min-height: 100svh;
    display: block;
    padding: 76px 10px 96px;
  }

  .mobile-topbar {
    position: fixed;
    inset: 8px 8px auto;
    z-index: 35;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    align-items: center;
    gap: 10px;
    min-height: 56px;
    border-radius: 18px;
    padding: 7px 8px;
  }

  .hamburger,
  .mobile-add,
  .drawer-close {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid rgba(255, 255, 255, .1);
    border-radius: 13px;
    background: rgba(255, 255, 255, .08);
    color: white;
  }

  .hamburger {
    gap: 4px;
  }

  .hamburger span {
    width: 18px;
    height: 2px;
    border-radius: 999px;
    background: currentColor;
  }

  .mobile-title {
    display: grid;
    min-width: 0;
  }

  .mobile-title strong,
  .mobile-title small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-title small {
    color: #94a3b8;
    font-size: .78rem;
  }

  .mobile-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 38;
    display: block;
    background: rgba(2, 6, 23, .62);
    backdrop-filter: blur(10px);
  }

  .sidebar {
    position: fixed;
    inset: 8px 8px 8px auto;
    z-index: 40;
    width: min(310px, calc(100vw - 24px));
    height: auto;
    border-radius: 20px;
    padding: 14px;
    transform: translateX(calc(100% + 18px));
    transition: transform .25s ease;
    overflow-y: auto;
  }

  .sidebar nav {
    display: block;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .brand {
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .brand-mark {
    width: 40px;
    height: 40px;
    border-radius: 14px;
  }

  .brand small {
    display: none;
  }

  .nav-item {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    justify-content: space-between;
    margin-bottom: 7px;
  }

  .content {
    gap: 14px;
  }

  .hero,
  .page-header,
  .mini-card,
  .metric-card,
  .chart-card,
  .summary-card,
  .stats-card,
  .budgets-card,
  .table-card,
  .reports-card,
  .notifications-card,
  .settings-card {
    border-radius: 18px;
    padding: 16px;
  }

  h1 {
    font-size: 2.15rem;
    line-height: 1.25;
  }

  h2 {
    font-size: 1rem;
  }

  .hero p,
  .page-header p {
    line-height: 1.9;
  }

  .hero-actions,
  .segmented {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }

  .primary-button,
  .soft-button,
  .segmented button {
    min-height: 44px;
    padding: 10px 12px;
  }

  .widgets-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mini-card {
    min-height: 48px;
  }

  .metric-card {
    min-height: 48px;
  }

  .metric-card strong {
    font-size: 1rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .pie-wrap {
    min-height: auto;
  }

  .pie-chart {
    width: min(240px, 72vw);
    height: min(240px, 72vw);
    min-height: min(240px, 72vw);
  }

  .legend {
    grid-template-columns: 1fr;
  }

  .line-chart {
    height: 210px;
    margin-inline: -4px;
  }

  .stats-grid div,
  .stats-chart-panel,
  .budget-item,
  .notification-status,
  .notification-suggestion,
  .report-grid span,
  .settings-grid label {
    border-radius: 16px;
  }

  .notification-status-grid,
  .notification-suggestion {
    grid-template-columns: 1fr;
  }

  .notification-suggestion {
    display: grid;
  }

  .notification-actions {
    width: 100%;
  }

  .notification-actions button {
    flex: 1;
  }

  .filters {
    position: relative;
    grid-template-columns: 1fr 1fr;
  }

  .filters input[type='search'] {
    grid-column: 1 / -1;
  }

  .table-wrap {
    overflow: visible;
  }

  table,
  thead,
  tbody,
  tr,
  th,
  td {
    display: block;
    width: 100%;
    min-width: 0;
  }

  thead {
    display: none;
  }

  tbody {
    display: grid;
    gap: 12px;
  }

  tr {
    border: 1px solid rgba(255, 255, 255, .09);
    border-radius: 18px;
    padding: 10px;
    background: rgba(255, 255, 255, .045);
  }

  td {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 10px;
    align-items: center;
    border: 0;
    padding: 8px 4px;
    text-align: right;
  }

  td::before {
    color: #94a3b8;
    font-size: .82rem;
  }

  td:nth-child(1)::before { content: 'نوع'; }
  td:nth-child(2)::before { content: 'عنوان'; }
  td:nth-child(3)::before { content: 'دسته'; }
  td:nth-child(4)::before { content: 'تاریخ'; }
  td:nth-child(5)::before { content: 'مبلغ'; }
  td:nth-child(6)::before { content: 'عملیات'; }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .actions button {
    min-height: 38px;
  }

  .export-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }

  .fab {
    right: 90%;
    bottom: max(14px, env(safe-area-inset-bottom));
    width: 64px;
    height: 64px;
    transform: translateX(50%);
    border-radius: 22px;
  }

  .modal-backdrop {
    align-items: end;
    padding: 10px;
  }

  .modal {
    max-height: calc(100svh - 20px);
    overflow-y: auto;
    border-radius: 24px 24px 18px 18px;
  }

  .toast-stack {
    right: 10px;
    left: 10px;
    bottom: 88px;
  }
}

@media (max-width: 520px) {
  .app-shell {
    gap: 10px;
    padding: 70px 8px 82px;
    font-size: 12.5px;
  }

  .glass-panel {
    backdrop-filter: blur(18px);
  }

  .sidebar {
    inset: 6px 6px 6px auto;
    z-index: 40;
    width: min(292px, calc(100vw - 18px));
    border-radius: 16px;
    padding: 9px;
  }

  .mobile-topbar {
    inset: 6px 6px auto;
    min-height: 52px;
    grid-template-columns: 38px minmax(0, 1fr) 38px;
    border-radius: 16px;
  }

  .hamburger,
  .mobile-add,
  .drawer-close {
    width: 36px;
    height: 36px;
    border-radius: 12px;
  }

  .brand {
    gap: 8px;
    margin-bottom: 8px;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
    border-radius: 12px;
  }

  .brand strong {
    font-size: .92rem;
  }

  .nav-item {
    min-width: 74px;
    min-height: 34px;
    border-radius: 12px;
    padding: 7px 9px;
    font-size: .78rem;
  }

  .hero,
  .page-header,
  .mini-card,
  .metric-card,
  .chart-card,
  .summary-card,
  .stats-card,
  .budgets-card,
  .table-card,
  .reports-card,
  .notifications-card,
  .settings-card {
    border-radius: 14px;
    padding: 12px;
  }

  .hero,
  .page-header {
    gap: 12px;
  }

  .eyebrow {
    font-size: .78rem;
  }

  h1 {
    margin: 2px 0 6px;
    font-size: 1.55rem;
    line-height: 1.35;
  }

  h2 {
    font-size: .92rem;
  }

  .hero p,
  .page-header p,
  .section-title p,
  .metric-card p,
  .summary-card p {
    font-size: .78rem;
    line-height: 1.75;
  }

  .hero-actions {
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }

  .hero-actions .primary-button,
  .hero-actions .soft-button:first-child {
    grid-column: 1 / -1;
  }

  .primary-button,
  .soft-button,
  .export-actions button,
  .actions button,
  .segmented button {
    min-height: 36px;
    border-radius: 11px;
    padding: 8px 9px;
    font-size: .76rem;
    white-space: nowrap;
  }

  .widgets-grid,
  .cards-grid {
    gap: 9px;
  }

  .mini-card,
  .metric-card {
    gap: 8px;
    padding-inline: 10px;
  }

  .mini-card {
    min-height: 46px;
  }

  .mini-card span,
  .metric-top span {
    font-size: 1.1rem;
  }

  .mini-card strong {
    margin: 0;
    font-size: .82rem;
    white-space: nowrap;
    overflow-wrap: anywhere;
  }

  .metric-card {
    min-height: 46px;
  }

  .metric-card strong {
    margin: 0;
    font-size: clamp(.78rem, 3vw, .9rem);
  }

  .metric-top {
    gap: 6px;
  }

  .dashboard-grid {
    gap: 10px;
  }

  .weekly-category-budget {
    grid-template-columns: 1fr;
  }

  .weekly-category-head {
    white-space: normal;
  }

  .pie-chart {
    width: min(178px, 62vw);
    height: min(178px, 62vw);
    min-height: min(178px, 62vw);
  }

  .legend {
    gap: 7px;
  }

  .legend span,
  .budget-item,
  .report-grid span,
  .settings-grid label,
  td {
    font-size: .78rem;
  }

  .bar-chart {
    height: 280px;
    margin-top: 12px;
  }

  .line-chart {
    height: 164px;
  }

  .stats-grid,
  .stats-analysis-grid,
  .budget-grid,
  .report-grid,
  .settings-grid,
  .filters {
    gap: 8px;
  }

  .category-manager {
    grid-template-columns: 1fr 62px;
    gap: 8px;
    margin-top: 12px;
    border-radius: 12px;
    padding: 10px;
  }

  .category-manager label:nth-child(3),
  .category-manager button {
    grid-column: 1 / -1;
  }

  .stats-grid div,
  .stats-chart-panel,
  .budget-item,
  .report-grid span,
  .settings-grid label {
    border-radius: 12px;
    padding: 10px;
  }

  .budget-edit {
    grid-template-columns: 72px 1fr;
    align-items: center;
  }

  .budget-edit input {
    min-height: 34px;
    padding: 7px 9px;
  }

  input,
  select,
  textarea {
    min-height: 36px;
    border-radius: 11px;
    padding: 8px 9px;
    font-size: .78rem;
  }

  tr {
    border-radius: 13px;
    padding: 7px;
  }

  td {
    grid-template-columns: 62px 1fr;
    gap: 7px;
    padding: 5px 3px;
  }

  td::before {
    font-size: .72rem;
  }

  .pill {
    padding: 4px 8px;
  }

  .modal-backdrop {
    padding: 7px;
  }

  .modal {
    border-radius: 18px;
    padding: 14px;
  }

  .modal label {
    gap: 6px;
    margin-top: 10px;
    font-size: .82rem;
  }

  .fab {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    font-size: 1.55rem;
  }
}

@media (max-width: 380px) {
  .app-shell {
    padding-inline: 6px;
    font-size: 11.5px;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .widgets-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-actions,
  .filters,
  .export-actions {
    grid-template-columns: 1fr;
  }

  .hero-actions .primary-button,
  .hero-actions .soft-button:first-child {
    grid-column: auto;
  }

  .mini-card,
  .metric-card {
    min-height: auto;
  }

  .metric-card strong {
    font-size: .92rem;
  }

  .section-title {
    gap: 8px;
  }

  .nav-item {
    min-width: 66px;
    padding-inline: 8px;
  }

  .category-manager {
    grid-template-columns: 1fr;
  }

  .category-manager label:nth-child(3),
  .category-manager button {
    grid-column: auto;
  }

  td {
    grid-template-columns: 54px 1fr;
  }

  .actions {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 761px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    height: auto;
  }

  .sidebar nav {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .nav-item {
    justify-content: center;
    margin: 0;
  }

  .cards-grid,
  .widgets-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters,
  .budget-grid,
  .report-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1181px) {
  .app-shell {
    grid-template-columns: 280px minmax(0, 1fr);
    padding: 24px;
  }

  .sidebar {
    position: sticky;
    top: 24px;
    height: calc(100vh - 48px);
  }

  .sidebar nav {
    display: block;
  }

  .nav-item {
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .cards-grid,
  .widgets-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .filters {
    grid-template-columns: 1.6fr repeat(6, 1fr);
  }

  .budget-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .report-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
