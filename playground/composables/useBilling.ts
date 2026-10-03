import { requestCloudApi } from './cloudApi'

export interface BillingPlan { id: 'free' | 'pro'; name: string; description: string; entitlements: string[]; price: number | null; currency?: string; billingPeriod?: string; status: string }
export interface BillingSubscription { id: string; plan: 'pro'; status: 'pending' | 'active' | 'expired' | 'cancelled'; startedAt: string | null; expiresAt: string | null; cancelledAt: string | null }
export interface BillingState { plan: 'free' | 'pro'; subscription: BillingSubscription | null; entitlements: string[]; plans: BillingPlan[]; pendingPaymentId?: string }

const billing = shallowRef<BillingState | null>(null)
const billingBusy = ref(false)
const billingError = ref('')
let billingRevision = 0
let billingUserId = ''

export function useBilling() {
  const auth = useAuth()
  async function refreshBilling() {
    const revision = ++billingRevision
    const userId = auth.currentUser.value?.id ?? ''
    if (billingUserId !== userId) { billing.value = null; billingUserId = userId }
    if (!userId) { billingError.value = ''; billingBusy.value = false; return }
    billingBusy.value = true
    billingError.value = ''
    try {
      const response = await requestCloudApi('/api/billing')
      const result = await response.json() as BillingState & { error?: string }
      if (revision !== billingRevision) return
      if (response.status === 401) {
        await auth.refreshAuth()
        throw new Error('‏نشست حساب پایان یافته است.')
      }
      if (!response.ok) throw new Error('‏وضعیت اشتراک در دسترس نیست.')
      billing.value = result
    } catch (error) {
      if (revision === billingRevision) { billing.value = null; billingError.value = error instanceof Error ? error.message : '‏وضعیت اشتراک در دسترس نیست.' }
    } finally {
      if (revision === billingRevision) billingBusy.value = false
    }
  }

  async function testPayment(action: 'start-test' | 'resolve-test', paymentId?: string, outcome?: 'paid' | 'failed' | 'cancelled') {
    if (billingBusy.value) return false
    billingBusy.value = true
    billingError.value = ''
    try {
      const response = await requestCloudApi('/api/billing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, paymentId, outcome }),
      })
      if (!response.ok) throw new Error('‏عملیات پرداخت آزمایشی انجام نشد.')
      return true
    } catch {
      billingError.value = '‏عملیات پرداخت آزمایشی انجام نشد.'
      return false
    } finally {
      billingBusy.value = false
      await refreshBilling()
    }
  }

  return {
    billing, billingBusy, billingError, refreshBilling, testPayment,
    canUse: (feature: string) => billing.value?.entitlements.includes(feature) ?? false,
  }
}
