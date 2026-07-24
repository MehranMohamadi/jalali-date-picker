<script setup lang="ts">
import '@fontsource-variable/vazirmatn'
import './assets/css/budgetyar.css'
import './assets/css/budgetyar-overrides.css'
import {
  Bell,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Plus,
  ReceiptText,
  Repeat2,
  Settings,
  ShieldCheck,
  Target,
  WalletCards,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const budgetyar = useBudgetyar()
startBudgetyar()

const {
  activeSection,
  isMobileMenuOpen,
  isMobileViewport,
  toasts,
  openModal,
  destroyCharts,
  scheduleChartSync,
} = budgetyar

const navItems = [
  { label: '‏داشبورد', path: '/', group: '‏نمای کلی', icon: LayoutDashboard },
  { label: '‏تراکنش‌ها', path: '/transactions', group: '‏نمای کلی', icon: ReceiptText },
  { label: '‏بودجه‌ها', path: '/budgets', group: '‏برنامه‌ریزی', icon: WalletCards },
  { label: '‏قسط‌ها', path: '/installments', group: '‏برنامه‌ریزی', icon: CreditCard },
  { label: '‏هدف‌ها', path: '/goals', group: '‏برنامه‌ریزی', icon: Target },
  { label: '‏پرداخت‌های دوره‌ای', path: '/recurring', group: '‏برنامه‌ریزی', icon: Repeat2 },
  { label: '‏خرج‌های پیش‌رو', path: '/upcoming-expenses', group: '‏برنامه‌ریزی', icon: CalendarClock },
  { label: '‏برنامه‌ریزی', path: '/planning', group: '‏تحلیل و کنترل', icon: ClipboardList },
  { label: '‏بدهی‌ها', path: '/debts', group: '‏تحلیل و کنترل', icon: Landmark },
  { label: '‏قوانین', path: '/rules', group: '‏تحلیل و کنترل', icon: ListChecks },
  { label: '‏درآمد', path: '/income-planning', group: '‏تحلیل و کنترل', icon: CircleDollarSign },
  { label: '‏سلامت مالی', path: '/health', group: '‏تحلیل و کنترل', icon: ShieldCheck },
  { label: '‏تحلیل‌ها', path: '/analytics', group: '‏گزارش و تنظیمات', icon: ChartNoAxesCombined },
  { label: '‏اعلان‌ها', path: '/notifications', group: '‏گزارش و تنظیمات', icon: Bell },
  { label: '‏تنظیمات', path: '/settings', group: '‏گزارش و تنظیمات', icon: Settings },
]

const routeSectionMap: Record<string, string> = Object.fromEntries(navItems.map((item) => [item.path, item.label]))

const activePath = computed(() => {
  const path = route.path.replace(/\/$/, '') || '/'
  return navItems.some((item) => item.path === path) ? path : '/'
})

const activeTitle = computed(() => navItems.find((item) => item.path === activePath.value)?.label ?? '‏داشبورد')

watch(
  () => route.path,
  () => {
    activeSection.value = routeSectionMap[activePath.value] ?? '‏داشبورد'
    isMobileMenuOpen.value = false
    destroyCharts()
    nextTick(scheduleChartSync)
  },
  { immediate: true },
)

function quickAdd() {
  if (route.path !== '/transactions') router.push('/transactions')
  openModal('expense')
}
</script>

<template>
  <main dir="rtl" class="app-shell" :class="{ 'mobile-perf': isMobileViewport }">
    <MobileTopbar
      :title="activeTitle"
      :open="isMobileMenuOpen"
      @open-menu="isMobileMenuOpen = true"
      @quick-add="quickAdd"
    />
    <div v-if="isMobileMenuOpen" class="mobile-menu-backdrop" @click="isMobileMenuOpen = false" />

    <AppSidebar
      :items="navItems"
      :active-path="activePath"
      :open="isMobileMenuOpen"
      @close="isMobileMenuOpen = false"
    />

    <section class="content">
      <NuxtPage />
    </section>

    <button class="fab" type="button" aria-label="‏ثبت سریع" @click="quickAdd">
      <Plus :size="24" aria-hidden="true" />
      <span>‏ثبت هزینه</span>
    </button>
    <TransactionModal />
    <ToastStack :toasts="toasts" />
  </main>
</template>
