import { APP_VERSION } from '../version'

interface Release { buildId: string; version: string; minNativeVersion: number; notes: string }
declare global { interface Window { budgetyarWorker?: Promise<ServiceWorkerRegistration> } }

let registration: ServiceWorkerRegistration | undefined
let started = false
let edited = false
let changedController = false

function workerVersion(worker: ServiceWorker): Promise<Release> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('Worker timeout')) }, 5000)
    channel.port1.onmessage = event => { clearTimeout(timeout); channel.port1.close(); resolve(event.data) }
    worker.postMessage({ type: 'version' }, [channel.port2])
  })
}

export function useAppUpdates() {
  const buildId = String(useRuntimeConfig().public.buildId)
  const state = useState('budgetyar-updates', () => ({ ready: false, busy: false, dismissed: false, demo: false, notes: '', version: '', message: '' }))
  const { isModalOpen } = useBudgetyar()

  async function inspectWaiting() {
    if (!registration?.waiting) return
    const release = await workerVersion(registration.waiting)
    if (release.buildId === buildId) return
    const nativeVersion = Number(navigator.userAgent.match(/BudgetyarAndroid\/(\d+)/)?.[1] || 0)
    if (nativeVersion && nativeVersion < release.minNativeVersion) {
      state.value.message = '‏این نسخه به APK جدید نیاز دارد.'
      return
    }
    Object.assign(state.value, { ready: true, dismissed: false, busy: false, version: release.version, notes: release.notes, message: '‏نسخهٔ جدید آمادهٔ نصب است.' })
  }

  function observe(worker: ServiceWorker) {
    state.value.message = '‏در حال دریافت و بررسی فایل‌های نسخهٔ جدید…'
    state.value.busy = true
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') { state.value.busy = false; void inspectWaiting().catch(reportError) }
      if (worker.state === 'redundant') reportError()
      if (worker.state === 'activated' && !state.value.ready) { state.value.busy = false; state.value.message = '‏نسخهٔ فعلی برای استفادهٔ آفلاین آماده است.' }
    })
  }

  function reportError() {
    state.value.busy = false
    state.value.message = '‏دریافت آپدیت کامل نشد؛ اتصال را بررسی و دوباره تلاش کنید.'
  }

  async function check() {
    if (state.value.busy) return
    if (!registration) { state.value.message = '‏آپدیت در نسخهٔ منتشرشده فعال است. برای APK قدیمی ابتدا پوستهٔ جدید را نصب کنید.'; return }
    state.value.busy = true
    state.value.message = '‏در حال بررسی نسخه…'
    try {
      const response = await fetch('/version.json', { cache: 'no-store' })
      if (!response.ok) throw new Error('Version unavailable')
      const release: Release = await response.json()
      if (!release.buildId || !release.version) throw new Error('Invalid version')
      await registration.update()
      if (registration.waiting) await inspectWaiting()
      else if (!registration.installing) state.value.message = release.buildId === buildId ? '‏برنامه به‌روز است.' : '‏دریافت نسخه کامل نشده؛ دوباره بررسی کنید.'
    } catch { reportError() }
    finally { state.value.busy = Boolean(registration?.installing) }
  }

  function apply() {
    if (isModalOpen.value) { state.value.message = '‏ابتدا فرم تراکنش را ذخیره کنید یا ببندید.'; return }
    if (edited && !window.confirm('‏برای اعمال آپدیت، صفحه دوباره باز می‌شود. تغییرات فرم‌ها را ذخیره کرده‌اید؟')) return
    edited = false
    if (changedController) { location.reload(); return }
    if (!registration?.waiting) { void check(); return }
    state.value.busy = true
    registration.waiting.postMessage({ type: 'upgrade' })
    setTimeout(() => { if (state.value.busy) { state.value.busy = false; state.value.message = '‏اعمال آپدیت کامل نشده؛ دوباره تلاش کنید.' } }, 15000)
  }

  async function start() {
    if (started || !window.budgetyarWorker) return
    started = true
    document.addEventListener('input', () => { edited = true }, true)
    let hadController = Boolean(navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) {
        hadController = true
        navigator.serviceWorker.controller?.postMessage({ type: 'healthy', buildId })
        return
      }
      changedController = true
      state.value.ready = true
      state.value.busy = false
      if (!edited && !isModalOpen.value) location.reload()
      else state.value.message = '‏نسخهٔ جدید فعال شده؛ پس از ذخیرهٔ فرم، اعمال به‌روزرسانی را بزنید.'
    })
    try {
      registration = await window.budgetyarWorker
      registration.addEventListener('updatefound', () => { if (registration?.installing) observe(registration.installing) })
      if (registration.installing) observe(registration.installing)
      await inspectWaiting()
      navigator.serviceWorker.controller?.postMessage({ type: 'healthy', buildId })
    } catch { started = false; reportError() }
  }

  return { state, buildId, version: APP_VERSION, start, check, apply }
}
