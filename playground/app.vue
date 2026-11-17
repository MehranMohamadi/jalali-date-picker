<script setup lang="ts">
import '@fontsource-variable/vazirmatn'
import './assets/css/budgetyar.css'
import './assets/css/budgetyar-overrides.css'
import './assets/css/budgetyar-compact.css'
import './assets/css/budgetyar-pages.css'
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
const { amountsHidden, start: startPrivacy } = usePrivacy()
onMounted(() => { void startPrivacy(); void appUpdates.start() })
watch(amountsHidden, () => { destroyCharts(); nextTick(scheduleChartSync) })

const {
  activeSection,
  isMobileMenuOpen,
  isModalOpen,
  isMobileViewport,
  toasts,
  deviceStorageError,
  deviceReadBlocked,
  exportDeviceRecovery,
  importBackup,
  retryDeviceStorage,
  exportReport,
  openModal,
  destroyCharts,
  scheduleChartSync,
} = budgetyar

const isMobilePanelOpen = computed(() => isMobileViewport.value && (isMobileMenuOpen.value || isModalOpen.value))

watch(() => isMobileMenuOpen.value || isModalOpen.value, (open, _, onCleanup) => {
  if (!open || !import.meta.client) return
  const previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  onCleanup(() => { document.body.style.overflow = previousOverflow })
})

function closeMobilePanels() {
  isMobileMenuOpen.value = false
  isModalOpen.value = false
}

function toggleMobileMenu() {
  isModalOpen.value = false
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const navItems = [
  { label: '‏داشبورد', path: '/', group: '‏روزمره', icon: LayoutDashboard },
  { label: '‏تراکنش‌ها', path: '/transactions', group: '‏روزمره', icon: ReceiptText },
  { label: '‏بودجه‌ها', path: '/budgets', group: '‏روزمره', icon: WalletCards },
  { label: '‏برنامه‌ریزی', path: '/planning', group: '‏برنامه‌ریزی', icon: ClipboardList },
  { label: '‏قسط‌ها', path: '/installments', group: '‏برنامه‌ریزی', icon: CreditCard },
  { label: '‏اشتراک‌های من', path: '/subscriptions', group: '‏برنامه‌ریزی', icon: CalendarClock },
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

watch(isMobileViewport, (mobile) => {
  if (!mobile) isMobileMenuOpen.value = false
})

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
  if (isMobileViewport.value && isModalOpen.value) {
    isModalOpen.value = false
    return
  }
  isMobileMenuOpen.value = false
  if (route.path !== '/transactions') router.push('/transactions')
  openModal('expense')
}
</script>

<template>
  <main dir="rtl" class="app-shell" :class="{ 'mobile-perf': isMobileViewport, 'amounts-hidden': amountsHidden }">
    <MobileTopbar
      :title="activeTitle"
      :inert="isMobilePanelOpen"
    />
    <Transition name="mobile-menu">
      <div v-if="isMobilePanelOpen" class="mobile-menu-backdrop" @click="closeMobilePanels" />
    </Transition>

    <AppSidebar
      :items="navItems"
      :active-path="activePath"
      :open="false"
      @close="isMobileMenuOpen = false"
    />

    <section class="content" :inert="isMobilePanelOpen">
      <div class="desktop-privacy-tools"><PrivacyToggle /></div>
      <div v-if="deviceStorageError" class="device-storage-warning" role="alert">
        <p v-if="deviceReadBlocked">‏اطلاعات دستگاه خوانده نشد. برای حفظ نسخهٔ موجود، تغییر اطلاعات متوقف است. دوباره تلاش کن، فایل نجات بگیر یا پشتیبان سالم وارد کن.</p>
        <p v-else>‏بخشی از تغییرات روی دستگاه ذخیره نشده است. پیش از بستن برنامه، فایل پشتیبان بگیر یا ذخیره را دوباره امتحان کن.</p>
        <div class="settings-actions">
          <button class="soft-button" type="button" @click="retryDeviceStorage">‏تلاش دوباره برای ذخیره</button>
          <button v-if="deviceReadBlocked" class="primary-button" type="button" @click="exportDeviceRecovery">‏ذخیرهٔ فایل نجات</button>
          <button v-else class="primary-button" type="button" @click="exportReport('JSON')">‏ذخیرهٔ فایل پشتیبان</button>
          <label v-if="deviceReadBlocked" class="soft-button">‏ورود پشتیبان سالم <input type="file" accept="application/json,.json" aria-label="‏ورود پشتیبان سالم" @change="importBackup" /></label>
        </div>
        <p v-if="deviceReadBlocked">‏فایل نجات دادهٔ خام را نگه می‌دارد و برای بررسی است؛ فایل پشتیبان معمولی نیست. پاک‌کردن حافظهٔ مرورگر، راه بازیابی نیست.</p>
      </div>
      <NuxtPage v-if="!deviceReadBlocked" />
    </section>

    <button class="fab" type="button" aria-label="‏ثبت سریع" @click="quickAdd">
      <Plus :size="24" aria-hidden="true" />
      <span>‏ثبت هزینه</span>
    </button>
    <BottomNavigation
      :items="navItems"
      :active-path="activePath"
      :open="isMobileMenuOpen"
      @toggle-menu="toggleMobileMenu"
      @close="closeMobilePanels"
      @quick-add="quickAdd"
    />
    <div :inert="deviceReadBlocked"><TransactionModal /></div>
    <ConfirmBottomSheet />
    <ToastStack :toasts="toasts" />
    <AppUpdateNotice />
  </main>
</template>

<style>
.desktop-privacy-tools { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.amounts-hidden .amount-in-words { display: none; }
.amounts-hidden .chart-canvas { display: none; }
@media (max-width: 760px) { .desktop-privacy-tools { display: none; } }
</style>
