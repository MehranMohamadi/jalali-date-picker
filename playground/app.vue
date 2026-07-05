<script setup lang="ts">
import '@fontsource-variable/vazirmatn'
import './assets/css/budgetyar.css'
import './assets/css/budgetyar-overrides.css'

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
  { label: 'داشبورد', path: '/' },
  { label: 'تراکنش‌ها', path: '/transactions' },
  { label: 'بودجه‌ها', path: '/budgets' },
  { label: 'قسط‌ها', path: '/installments' },
  { label: 'تحلیل‌ها', path: '/analytics' },
  { label: 'اعلان‌ها', path: '/notifications' },
  { label: 'تنظیمات', path: '/settings' },
]

const routeSectionMap: Record<string, string> = {
  '/': 'داشبورد',
  '/transactions': 'تراکنش‌ها',
  '/budgets': 'بودجه‌ها',
  '/installments': 'قسط‌ها',
  '/analytics': 'آمار',
  '/notifications': 'اعلان‌ها',
  '/settings': 'تنظیمات',
}

const activePath = computed(() => {
  const path = route.path.replace(/\/$/, '') || '/'
  return navItems.some((item) => item.path === path) ? path : '/'
})

const activeTitle = computed(() => navItems.find((item) => item.path === activePath.value)?.label ?? 'داشبورد')

watch(
  () => route.path,
  () => {
    activeSection.value = routeSectionMap[activePath.value] ?? 'داشبورد'
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
    <MobileTopbar :title="activeTitle" :open="isMobileMenuOpen" @open-menu="isMobileMenuOpen = true" />
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

    <button class="fab" type="button" aria-label="ثبت سریع" @click="quickAdd">＋</button>
    <TransactionModal />
    <ToastStack :toasts="toasts" />
  </main>
</template>
