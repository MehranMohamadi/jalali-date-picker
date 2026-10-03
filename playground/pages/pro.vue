<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

const auth = useAuth()
const { billing, billingBusy, billingError, refreshBilling, testPayment } = useBilling()
const pro = computed(() => billing.value?.plans.find(plan => plan.id === 'pro'))
const free = computed(() => billing.value?.plans.find(plan => plan.id === 'free'))
const active = computed(() => billing.value?.plan === 'pro')
const pending = computed(() => billing.value?.subscription?.status === 'pending' && !!billing.value.pendingPaymentId)
const dateText = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value)) : '—'

onMounted(async () => {
  await auth.initAuth()
  await refreshBilling()
})
watch(auth.currentUser, () => { void refreshBilling() })
</script>

<template>
  <div class="pro-page">
    <section class="glass-panel pro-hero">
      <span class="pro-icon"><Sparkles :size="22" aria-hidden="true" /></span>
      <div>
        <h1>‏بودجه‌یار Pro</h1>
        <p>‏طرح Pro برای امکاناتی که در آینده مشخص می‌شوند آماده شده است. امکانات فعلی برنامه برای همه در دسترس‌اند.</p>
      </div>
    </section>

    <div class="pro-grid">
      <section class="glass-panel pro-card">
        <h2>{{ free?.name || '‏رایگان' }}</h2>
        <p>{{ free?.description || '‏امکانات فعلی بودجه‌یار' }}</p>
        <strong>‏امکانات فعلی</strong>
      </section>
      <section class="glass-panel pro-card">
        <span class="pro-badge">PRO</span>
        <h2>{{ pro?.name || 'Pro' }}</h2>
        <p>{{ pro?.description || '‏جزئیات این طرح هنوز مشخص نشده است.' }}</p>
        <p v-if="pro?.price != null">{{ pro.price.toLocaleString('fa-IR') }} {{ pro.currency }} · {{ pro.billingPeriod }}</p>
        <p v-else>‏قیمت و دورهٔ اشتراک هنوز تعیین نشده‌اند.</p>
      </section>
    </div>

    <section class="glass-panel pro-status" aria-live="polite">
      <h2>‏وضعیت حساب و اشتراک</h2>
      <p v-if="!auth.isAuthInitialized.value || auth.isAuthWorking.value">‏در حال بررسی حساب…</p>
      <template v-else-if="!auth.currentUser.value">
        <p>‏برای دریافت اشتراک، ابتدا وارد حساب خود شوید.</p>
        <NuxtLink to="/login" class="primary-button pro-action">‏ورود یا ساخت حساب</NuxtLink>
      </template>
      <p v-else-if="billingBusy && !billing">‏در حال دریافت وضعیت اشتراک…</p>
      <template v-else-if="billing">
        <p>‏طرح فعلی: <strong>{{ active ? 'Pro' : '‏رایگان' }}</strong></p>
        <p v-if="billing.subscription?.startedAt">‏شروع: {{ dateText(billing.subscription.startedAt) }}</p>
        <p v-if="billing.subscription?.expiresAt">‏اعتبار تا: {{ dateText(billing.subscription.expiresAt) }}</p>
        <p v-if="pending">‏پرداخت آزمایشی در انتظار تأیید است.</p>
        <p v-else-if="billing.subscription?.status === 'expired' || billing.subscription?.expiresAt && !active">‏اشتراک قبلی پایان یافته است.</p>
        <p v-else-if="billing.subscription?.status === 'cancelled'">‏اشتراک لغو شده است.</p>
        <div v-if="pro?.status === 'test'" class="pro-actions">
          <template v-if="pending">
            <button class="primary-button pro-action" type="button" :disabled="billingBusy" @click="testPayment('resolve-test', billing.pendingPaymentId, 'paid')">‏تأیید پرداخت آزمایشی</button>
            <button class="soft-button pro-action" type="button" :disabled="billingBusy" @click="testPayment('resolve-test', billing.pendingPaymentId, 'failed')">‏شبیه‌سازی خطا</button>
            <button class="soft-button pro-action" type="button" :disabled="billingBusy" @click="testPayment('resolve-test', billing.pendingPaymentId, 'cancelled')">‏لغو پرداخت آزمایشی</button>
          </template>
          <button v-else-if="!active" class="primary-button pro-action" type="button" :disabled="billingBusy" @click="testPayment('start-test')">‏شروع پرداخت آزمایشی</button>
        </div>
        <p v-else-if="!active">‏خرید Pro هنوز فعال نشده است.</p>
      </template>
      <button v-if="billingError" class="soft-button pro-action" type="button" :disabled="billingBusy" @click="refreshBilling">‏تلاش دوباره</button>
      <p v-if="billingError" class="pro-error" role="alert">{{ billingError }}</p>
    </section>
  </div>
</template>

<style scoped>
.pro-page { display: grid; gap: 14px; }
.pro-hero, .pro-status, .pro-card { padding: 18px; }
.pro-hero { align-items: start; display: flex; gap: 12px; }
.pro-hero h1 { font-size: 1.5rem; margin: 0 0 5px; }
.pro-hero p, .pro-card p, .pro-status p { color: var(--muted); line-height: 1.8; margin: 4px 0; }
.pro-icon { color: var(--primary); }
.pro-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.pro-card { display: grid; gap: 8px; align-content: start; }
.pro-card h2, .pro-status h2 { font-size: 1rem; margin: 0 0 4px; }
.pro-badge { color: var(--primary); font-size: .7rem; font-weight: 800; }
.pro-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.pro-action { align-items: center; display: inline-flex; justify-content: center; min-height: 40px; padding: 8px 14px; text-decoration: none; }
.pro-error { color: #fb7185 !important; }
@media (max-width: 680px) { .pro-grid { grid-template-columns: 1fr; } .pro-actions { display: grid; } }
</style>
