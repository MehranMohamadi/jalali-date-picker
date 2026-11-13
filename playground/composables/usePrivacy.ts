import { computed, readonly, ref } from 'vue'
import { Capacitor, registerPlugin } from '@capacitor/core'

const storageKey = 'budgetyar-hide-amounts-v1'
const nativePrivacy = registerPlugin<{
  getStatus(): Promise<{ enabled: boolean; available: boolean }>
  setEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean; available: boolean }>
}>('BudgetyarPrivacy')

// Hide during initial hydration until this device's preference is read.
const amountsHidden = ref(true)
const lockEnabled = ref(false)
const lockAvailable = ref(false)
const nativeSupported = ref(false)
const busy = ref(false)
const message = ref('')

// Display helpers only: never mask persisted values, calculations, or exports.
export function privateText(value: string) {
  return amountsHidden.value ? '••••' : value
}

export function privateFormatter<Args extends unknown[]>(formatter: (...args: Args) => string) {
  return (...args: Args) => amountsHidden.value ? '••••' : formatter(...args)
}

async function refreshLock() {
  nativeSupported.value = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('BudgetyarPrivacy')
  if (!nativeSupported.value) return
  try {
    const status = await nativePrivacy.getStatus()
    lockEnabled.value = status.enabled
    lockAvailable.value = status.available
  } catch {
    lockAvailable.value = false
    message.value = '‏بررسی قفل برنامه انجام نشد؛ دوباره تلاش کن.'
  }
}

async function start() {
  try { amountsHidden.value = localStorage.getItem(storageKey) === 'true' } catch { /* Device storage can be unavailable. */ }
  await refreshLock()
}

function toggleAmounts() {
  amountsHidden.value = !amountsHidden.value
  try { localStorage.setItem(storageKey, String(amountsHidden.value)) } catch { /* Keep the current session usable. */ }
}

async function toggleLock() {
  if (busy.value || !nativeSupported.value) return
  busy.value = true
  message.value = ''
  try {
    const status = await nativePrivacy.setEnabled({ enabled: !lockEnabled.value })
    lockEnabled.value = status.enabled
    lockAvailable.value = status.available
    message.value = status.enabled ? '‏قفل هنگام بازگشت به برنامه فعال شد.' : '‏قفل برنامه غیرفعال شد.'
  } catch {
    message.value = '‏تأیید انجام نشد؛ تنظیم قفل تغییر نکرد.'
  } finally {
    busy.value = false
  }
}

export function usePrivacy() {
  return {
    amountsHidden: readonly(amountsHidden), lockEnabled: readonly(lockEnabled),
    lockAvailable: readonly(lockAvailable), nativeSupported: readonly(nativeSupported),
    busy: readonly(busy), message: readonly(message),
    toggleLabel: computed(() => amountsHidden.value ? '‏نمایش مبلغ‌ها' : '‏مخفی‌کردن مبلغ‌ها'),
    start, refreshLock, toggleAmounts, toggleLock, privateText,
  }
}
