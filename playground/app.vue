<script setup lang="ts">
import '@fontsource-variable/vazirmatn'
import { getJalaliMonthLength, toJalali } from '../src/utils/jalali'

type TransactionType = 'income' | 'expense'

type CategoryKey = string

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
}

interface BudgetGoal {
  category: CategoryKey
  budget: number
}

interface ToastMessage {
  id: number
  text: string
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
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
const navItems = ['داشبورد', 'درآمدها', 'هزینه‌ها', 'بودجه‌ها', 'گزارش‌ها', 'آمار', 'تنظیمات']
const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const currentJalaliDate = getCurrentJalaliDate()
const todayKey = formatJalaliInputDate(currentJalaliDate)
const currentMonthPrefix = `${currentJalaliDate.year}/${String(currentJalaliDate.month).padStart(2, '0')}/`
const currentMonthLength = getJalaliMonthLength(currentJalaliDate.year, currentJalaliDate.month)
const currentMonthStartKey = formatJalaliInputDate({ ...currentJalaliDate, day: 1 })
const currentMonthYear = `${months[currentJalaliDate.month - 1]} ${toPersianNumber(currentJalaliDate.year)}`
const years = [currentJalaliDate.year - 1, currentJalaliDate.year, currentJalaliDate.year + 1].map(toPersianNumber)
const query = ref('')
const selectedMonth = ref(months[currentJalaliDate.month - 1])
const selectedYear = ref(toPersianNumber(currentJalaliDate.year))
const selectedCategory = ref('همه')
const selectedType = ref('همه')
const dateRange = reactive({ start: '', end: '' })
const isModalOpen = ref(false)
const formType = ref<TransactionType>('expense')
const toasts = ref<ToastMessage[]>([])
const editingId = ref<number | null>(null)

const form = reactive({
  amount: 0,
  title: '',
  date: todayKey,
  category: 'food' as CategoryKey,
  description: '',
})

const categoryForm = reactive({
  label: '',
  icon: '✨',
  budget: 1000000,
})
const installPrompt = ref<InstallPromptEvent | null>(null)
const isStandalone = ref(false)
const today = formatDisplayJalaliDate(currentJalaliDate)

const expenseTransactions = computed(() => transactions.value.filter((item) => item.type === 'expense'))
const incomeTransactions = computed(() => transactions.value.filter((item) => item.type === 'income'))
const totalIncome = computed(() => incomeTransactions.value.reduce((sum, item) => sum + item.amount, 0))
const totalExpense = computed(() => expenseTransactions.value.reduce((sum, item) => sum + item.amount, 0))
const balance = computed(() => totalIncome.value - totalExpense.value)
const budgetUsage = computed(() => Math.round((totalExpense.value / Math.max(totalIncome.value, 1)) * 100))
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

const maxCategory = computed(() => [...categoryTotals.value].sort((a, b) => b.spent - a.spent)[0])
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
const todayExpense = computed(() => expenseTransactions.value.filter((item) => item.date === todayKey).reduce((sum, item) => sum + item.amount, 0))
const todayIncome = computed(() => incomeTransactions.value.filter((item) => item.date === todayKey).reduce((sum, item) => sum + item.amount, 0))
const averageDailyExpense = computed(() => Math.round(totalExpense.value / 28))

const filteredTransactions = computed(() => {
  const normalizedQuery = query.value.trim()
  return transactions.value.filter((item) => {
    const category = item.category ? getCategory(item.category).label : 'درآمد'
    const matchesQuery = !normalizedQuery || `${item.title} ${category} ${item.description ?? ''}`.includes(normalizedQuery)
    const matchesCategory = selectedCategory.value === 'همه' || category === selectedCategory.value
    const matchesType =
      selectedType.value === 'همه' ||
      (selectedType.value === 'درآمد' && item.type === 'income') ||
      (selectedType.value === 'هزینه' && item.type === 'expense')
    const matchesStart = !dateRange.start || item.date >= dateRange.start
    const matchesEnd = !dateRange.end || item.date <= dateRange.end
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

const trendChart = computed(() => {
  const width = 700
  const top = 24
  const bottom = 200
  const points = dailyTrend.value
  const maxValue = Math.max(...points.flatMap((point) => [point.expense, point.balance]), 1)
  const xStep = points.length > 1 ? width / (points.length - 1) : width
  const yFor = (value: number) => bottom - (Math.max(0, value) / maxValue) * (bottom - top)
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: Math.round(index * xStep),
    expenseY: Math.round(yFor(point.expense)),
    balanceY: Math.round(yFor(point.balance)),
  }))
  const expensePath = toLinePath(chartPoints.map((point) => ({ x: point.x, y: point.expenseY })))
  const balancePath = toLinePath(chartPoints.map((point) => ({ x: point.x, y: point.balanceY })))
  const firstPoint = chartPoints[0]
  const lastPoint = chartPoints[chartPoints.length - 1]
  const expenseAreaPath = firstPoint && lastPoint ? `${expensePath} L ${lastPoint.x} ${bottom} L ${firstPoint.x} ${bottom} Z` : ''

  return { expensePath, balancePath, expenseAreaPath, points: chartPoints }
})

const summaryLines = computed(() => [
  `این ماه ${toPersianNumber(budgetUsage.value)}٪ بودجه مصرف شده است.`,
  `بیشترین هزینه مربوط به ${safeMaxCategory.value.label ?? 'بدون دسته'} بوده است.`,
  '۱۵٪ نسبت به ماه قبل کمتر خرج کرده‌اید.',
])

const insights = computed(() => [
  '💡 این ماه نسبت به ماه گذشته ۱۸٪ کمتر خرج کرده‌اید.',
  `💡 بیشترین هزینه شما مربوط به ${safeMaxCategory.value.label ?? 'غذا'} است.`,
  `💡 اگر با همین روند ادامه دهید تا پایان ماه حدود ${formatCompact(balance.value)} پس‌انداز خواهید داشت.`,
])

const dashboardCards = computed(() => [
  { label: 'درآمد ماه', value: totalIncome.value, icon: '💰', hint: '۱۲٪ رشد نسبت به ماه قبل', className: 'card-cyan' },
  { label: 'هزینه ماه', value: totalExpense.value, icon: '💸', hint: '۱۵٪ کمتر از ماه قبل', className: 'card-violet' },
  { label: 'باقی مانده', value: balance.value, icon: '💵', hint: 'وضعیت عالی برای پس‌انداز', className: 'card-blue' },
  { label: 'درصد مصرف بودجه', value: budgetUsage.value, suffix: '٪', icon: '📈', hint: 'زیر سقف هدف ماهانه', className: 'card-pink' },
])

const widgets = computed(() => [
  { label: 'امروز', value: today, icon: '📅' },
  { label: 'خرج امروز', value: formatMoney(todayExpense.value), icon: '💸' },
  { label: 'درآمد امروز', value: formatMoney(todayIncome.value), icon: '💰' },
  { label: 'پس انداز', value: `${toPersianNumber(savingsPercent.value)}٪`, icon: '📈' },
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
  return normalizeDigits(value.trim()).replace(/-/g, '/')
}

function getJalaliInputDay(value: string) {
  return Number(normalizeJalaliDate(value).split('/')[2] ?? 0)
}

function getTrendDays() {
  return [...new Set([1, 5, 10, 15, 20, 25, currentMonthLength].filter((day) => day <= currentMonthLength))].sort((a, b) => a - b)
}

function toLinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
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

function updateMoneyInput(target: { amount?: number; budget?: number }, key: 'amount' | 'budget', event: Event) {
  const input = event.target as HTMLInputElement
  const amount = parseMoneyInput(input.value)
  target[key] = amount
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
  Object.assign(form, { amount: 0, title: '', date: todayKey, category: categories.value[0]?.key ?? 'other', description: '' })
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
  })
  isModalOpen.value = true
}

function saveTransaction() {
  if (!form.title || !form.amount) return
  const payload: Transaction = {
    id: editingId.value ?? Date.now(),
    type: formType.value,
    title: form.title,
    amount: Number(form.amount),
    date: form.date,
    category: formType.value === 'expense' ? form.category : undefined,
    description: form.description,
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

function exportReport(format: string) {
  pushToast(`خروجی ${format} آماده شد ✅`)
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

function pieSegments() {
  let offset = 25
  const total = Math.max(totalExpense.value, 1)
  return categoryTotals.value
    .filter((item) => item.spent > 0)
    .map((item) => {
      const percent = (item.spent / total) * 100
      const segment = { ...item, dash: `${percent} ${100 - percent}`, offset }
      offset -= percent
      return segment
    })
}

onMounted(() => {
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true

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
      <button class="mobile-add" type="button" aria-label="ثبت هزینه" @click="openModal('expense')">＋</button>
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
          <button class="soft-button" type="button" @click="exportReport('PDF')">خروجی PDF</button>
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
          <button v-if="activeSection === 'گزارش‌ها'" class="soft-button" type="button" @click="exportReport('PDF')">خروجی PDF</button>
          <button v-if="activeSection === 'تنظیمات' && !isStandalone" class="soft-button" type="button" @click="installApp">نصب اپ</button>
        </div>
      </section> -->

      <section v-if="activeSection === 'داشبورد'" class="widgets-grid">
        <article v-for="widget in widgets" :key="widget.label" class="mini-card glass-panel">
          <span>{{ widget.icon }}</span>
          <small>{{ widget.label }}</small>
          <strong>{{ widget.value }}</strong>
        </article>
      </section>

      <section v-if="activeSection === 'داشبورد'" class="cards-grid">
        <article v-for="card in dashboardCards" :key="card.label" class="metric-card glass-panel" :class="card.className">
          <div class="metric-top">
            <span>{{ card.icon }}</span>
            <small>{{ card.label }}</small>
          </div>
          <strong>
            <span class="counter">{{ card.suffix ? toPersianNumber(card.value) : formatMoney(card.value) }}</span>{{ card.suffix ?? '' }}
          </strong>
          <p>{{ card.hint }}</p>
        </article>
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
            <svg viewBox="0 0 42 42" class="pie-chart" aria-label="نمودار دایره‌ای هزینه‌ها">
              <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="rgba(255,255,255,.08)" stroke-width="6" />
              <circle
                v-for="segment in pieSegments()"
                :key="segment.key"
                cx="21"
                cy="21"
                r="15.9"
                fill="transparent"
                :stroke="segment.color"
                stroke-width="6"
                :stroke-dasharray="segment.dash"
                :stroke-dashoffset="segment.offset"
              />
            </svg>
            <div class="legend">
              <span v-for="item in categoryTotals.filter((category) => category.spent > 0).slice(0, 7)" :key="item.key">
                <i :style="{ background: item.color }" />
                {{ item.icon }} {{ item.label }} · {{ formatCompact(item.spent) }}
              </span>
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
          <div class="bar-chart">
            <div v-for="item in categoryTotals.slice(0, 10)" :key="item.key" class="bar-row">
              <span>{{ item.icon }} {{ item.label }}</span>
              <div class="bar-track">
                <i :style="{ width: `${progressPercent(item.spent, safeMaxCategory.spent || 1)}%`, background: item.color }" />
              </div>
              <strong>{{ formatCompact(item.spent) }}</strong>
            </div>
          </div>
        </article>

        <article class="chart-card glass-panel wide">
          <div class="section-title">
            <div>
              <h2>روند خرج کردن و باقی مانده بودجه</h2>
              <p>نمودار خطی و ناحیه‌ای در طول ماه</p>
            </div>
          </div>
          <div class="line-chart">
            <svg viewBox="0 0 700 240" preserveAspectRatio="none" aria-label="نمودار روند ماهانه">
              <defs>
                <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#22d3ee" stop-opacity=".45" />
                  <stop offset="100%" stop-color="#7c3aed" stop-opacity=".04" />
                </linearGradient>
              </defs>
              <path :d="trendChart.expenseAreaPath" fill="url(#areaGradient)" />
              <path :d="trendChart.expensePath" fill="none" stroke="#22d3ee" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
              <path :d="trendChart.balancePath" fill="none" stroke="#a78bfa" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
              <g v-for="point in trendChart.points" :key="point.label">
                <circle :cx="point.x" :cy="point.expenseY" r="6" fill="#22d3ee" />
                <circle :cx="point.x" :cy="point.balanceY" r="5" fill="#a78bfa" />
                <text :x="point.x" y="230" text-anchor="middle">{{ point.label }}</text>
              </g>
            </svg>
          </div>
        </article>
      </section>

      <section v-if="activeSection === 'گزارش‌ها' || activeSection === 'آمار'" class="dashboard-grid page-grid">
        <article v-if="activeSection === 'گزارش‌ها'" class="glass-panel summary-card" data-section="گزارش‌ها">
          <div class="section-title">
            <div>
              <h2>خلاصه ماهانه</h2>
              <p>به‌صورت خودکار از داده‌های همین ماه</p>
            </div>
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
            <div><span>بیشترین هزینه</span><strong>{{ highestExpense.title }} · {{ formatMoney(highestExpense.amount) }}</strong></div>
            <div><span>کمترین هزینه</span><strong>{{ lowestExpense.title }} · {{ formatMoney(lowestExpense.amount) }}</strong></div>
            <div><span>بیشترین دسته خرج</span><strong>{{ safeMaxCategory.icon }} {{ safeMaxCategory.label }}</strong></div>
            <div><span>میانگین خرج روزانه</span><strong>{{ formatMoney(averageDailyExpense) }}</strong></div>
            <div><span>درصد پس انداز</span><strong>{{ toPersianNumber(savingsPercent) }}٪</strong></div>
            <div><span>تعداد تراکنش‌ها</span><strong>{{ toPersianNumber(transactions.length) }}</strong></div>
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
          <input v-model="dateRange.start" type="text" placeholder="از تاریخ" aria-label="از تاریخ" />
          <input v-model="dateRange.end" type="text" placeholder="تا تاریخ" aria-label="تا تاریخ" />
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
            <button type="button" @click="exportReport('PDF')">PDF</button>
            <button type="button" @click="exportReport('Excel')">Excel</button>
            <button type="button" @click="exportReport('CSV')">CSV</button>
          </div>
        </div>
        <div class="report-grid">
          <span>گزارش ماهانه · {{ formatMoney(totalExpense) }}</span>
          <span>گزارش سالانه · روند هزینه کنترل‌شده</span>
          <span>گزارش دسته‌بندی · {{ safeMaxCategory.label }} در صدر</span>
          <span>گزارش پس‌انداز · {{ formatMoney(balance) }}</span>
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
          <label>ارز <select><option>تومان</option><option>ریال</option></select></label>
          <label>پوسته <select><option>فقط تاریک</option></select></label>
          <label>زبان <select><option>فارسی</option></select></label>
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
              <h2>{{ editingId ? 'ویرایش تراکنش' : 'ثبت تراکنش' }}</h2>
              <p>{{ formType === 'expense' ? 'ثبت هزینه' : 'ثبت درآمد' }}</p>
            </div>
            <button class="close" type="button" @click="isModalOpen = false">×</button>
          </div>
          <div class="segmented">
            <button type="button" :class="{ active: formType === 'expense' }" @click="formType = 'expense'">ثبت هزینه</button>
            <button type="button" :class="{ active: formType === 'income' }" @click="formType = 'income'">ثبت درآمد</button>
          </div>
          <label>مبلغ <input :value="formatMoneyInput(form.amount)" type="text" inputmode="numeric" required @input="updateMoneyInput(form, 'amount', $event)" /></label>
          <label>عنوان <input v-model="form.title" type="text" required /></label>
          <label v-if="formType === 'expense'">دسته بندی
            <select v-model="form.category">
              <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
            </select>
          </label>
          <label>تاریخ <input v-model="form.date" type="text" required /></label>
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
.settings-card p {
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
}

.mini-card,
.metric-card,
.chart-card,
.summary-card,
.stats-card,
.budgets-card,
.table-card,
.reports-card,
.settings-card {
  border-radius: 22px;
  padding: 20px;
}

.mini-card {
  min-height: 108px;
  transition: transform .25s ease;
}

.mini-card:hover,
.metric-card:hover,
.budget-item:hover {
  transform: translateY(-4px);
}

.mini-card span {
  font-size: 1.4rem;
}

.mini-card strong {
  display: block;
  margin-top: 8px;
}

.metric-card {
  position: relative;
  overflow: hidden;
  min-height: 174px;
  transition: .25s ease;
}

.metric-card::after {
  position: absolute;
  inset: auto -20% -45% -20%;
  height: 90px;
  content: '';
  filter: blur(28px);
  opacity: .5;
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

.metric-top span {
  font-size: 1.8rem;
  animation: float 3s ease-in-out infinite;
}

.metric-card strong {
  margin: 18px 0 8px;
  font-size: clamp(1.25rem, 2vw, 1.65rem);
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

.pie-chart {
  width: 220px;
  height: 220px;
  transform: rotate(-90deg);
  filter: drop-shadow(0 0 22px rgba(34, 211, 238, .22));
}

.pie-chart circle {
  animation: draw 1.2s ease both;
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
  display: grid;
  gap: 13px;
  margin-top: 20px;
}

.bar-row {
  display: grid;
  grid-template-columns: 112px 1fr 110px;
  gap: 12px;
  align-items: center;
  color: #cbd5e1;
}

.bar-track,
.progress {
  height: 11px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, .08);
}

.bar-track i,
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

.line-chart svg {
  width: 100%;
  height: 100%;
}

.line-chart text {
  fill: #94a3b8;
  font-size: 14px;
}

.summary-card,
.stats-card {
  min-height: 340px;
}

.summary-card > p {
  margin-top: 16px;
  line-height: 2;
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

.filters {
  display: grid;
  grid-template-columns: 1.6fr repeat(6, 1fr);
  gap: 10px;
  margin: 18px 0;
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
  min-width: 760px;
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

@keyframes draw {
  from { stroke-dasharray: 0 100; }
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
  .report-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
  .stats-grid,
  .pie-wrap {
    grid-template-columns: 1fr;
  }

  .pie-chart {
    justify-self: center;
  }

  .bar-row {
    grid-template-columns: 1fr;
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
    min-height: 96px;
  }

  .metric-card {
    min-height: 142px;
  }

  .metric-card strong {
    font-size: 1.25rem;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }

  .pie-wrap {
    min-height: auto;
  }

  .pie-chart {
    width: min(240px, 72vw);
    height: min(240px, 72vw);
  }

  .legend {
    grid-template-columns: 1fr;
  }

  .line-chart {
    height: 210px;
    margin-inline: -4px;
  }

  .bar-row strong {
    justify-self: start;
  }

  .stats-grid div,
  .budget-item,
  .report-grid span,
  .settings-grid label {
    border-radius: 16px;
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
    right: 50%;
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

  .mini-card {
    min-height: 76px;
  }

  .mini-card span,
  .metric-top span {
    font-size: 1.1rem;
  }

  .mini-card strong {
    margin-top: 4px;
    font-size: .82rem;
    overflow-wrap: anywhere;
  }

  .metric-card {
    min-height: 112px;
  }

  .metric-card strong {
    margin: 10px 0 4px;
    font-size: .98rem;
    word-break: break-word;
  }

  .metric-top {
    gap: 6px;
  }

  .dashboard-grid {
    gap: 10px;
  }

  .pie-chart {
    width: min(178px, 62vw);
    height: min(178px, 62vw);
  }

  .legend {
    gap: 7px;
  }

  .legend span,
  .bar-row,
  .budget-item,
  .report-grid span,
  .settings-grid label,
  td {
    font-size: .78rem;
  }

  .bar-chart {
    gap: 9px;
    margin-top: 12px;
  }

  .line-chart {
    height: 164px;
  }

  .stats-grid,
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
