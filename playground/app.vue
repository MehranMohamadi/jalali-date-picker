<script setup lang="ts">
import '@fontsource-variable/vazirmatn'
import './assets/css/budgetyar.css'
import './assets/css/budgetyar-overrides.css'
import {
  Bell,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Plus,
  Sparkles,
  ReceiptText,
  Repeat2,
  Settings,
  ShieldCheck,
  Target,
  UserCheck,
  WalletCards,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const budgetyar = useBudgetyar()
startBudgetyar()
const appUpdates = useAppUpdates()
onMounted(() => { void appUpdates.start() })

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
  { label: '‏داشبورد', path: '/', group: '‏روزمره', icon: LayoutDashboard },
  { label: '‏تراکنش‌ها', path: '/transactions', group: '‏روزمره', icon: ReceiptText },
  { label: '‏بودجه‌ها', path: '/budgets', group: '‏روزمره', icon: WalletCards },
  { label: '‏برنامه‌ریزی', path: '/planning', group: '‏برنامه‌ریزی', icon: ClipboardList },
  { label: '‏قسط‌ها', path: '/installments', group: '‏برنامه‌ریزی', icon: CreditCard },
  { label: '‏هدف‌ها', path: '/goals', group: '‏برنامه‌ریزی', icon: Target },
  { label: '‏تحلیل‌ها', path: '/analytics', group: '‏گزارش و تنظیمات', icon: ChartNoAxesCombined },
  { label: '‏تنظیمات', path: '/settings', group: '‏گزارش و تنظیمات', icon: Settings },
  { label: '‏اشتراک Pro', path: '/pro', group: '‏حساب', icon: Sparkles },
  { label: '‏پرداخت‌های دوره‌ای', path: '/recurring', group: '‏ابزارهای بیشتر', icon: Repeat2, secondary: true },
  { label: '‏بدهی‌ها', path: '/debts', group: '‏ابزارهای بیشتر', icon: Landmark, secondary: true },
  { label: '‏قوانین دسته‌بندی', path: '/rules', group: '‏ابزارهای بیشتر', icon: ListChecks, secondary: true },
  { label: '‏درآمد نامنظم', path: '/income-planning', group: '‏ابزارهای بیشتر', icon: CircleDollarSign, secondary: true },
  { label: '‏سلامت مالی', path: '/health', group: '‏ابزارهای بیشتر', icon: ShieldCheck, secondary: true },
  { label: '‏اعلان‌ها', path: '/notifications', group: '‏ابزارهای بیشتر', icon: Bell, secondary: true },
  { label: '‏حساب کاربری', path: '/login', group: '‏حساب', icon: UserCheck },
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
    <ConfirmBottomSheet />
    <ToastStack :toasts="toasts" />
    <AppUpdateNotice />
  </main>
</template>
