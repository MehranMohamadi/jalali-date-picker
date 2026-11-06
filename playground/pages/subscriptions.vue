<script setup lang="ts">
import { ArrowUpLeft, CalendarDays, Check, Hourglass, Plus, Sparkles, Ticket, Trash2, X } from 'lucide-vue-next'
import { parseJalaliInput, toGregorian, toJalali } from '../../src/utils/jalali'
import { toPersianDigits } from '../../src/utils/digits'
import { subscriptionDaysRemaining, type Subscription } from '../../src/utils/subscriptions'

const { subscriptions, saveSubscription, deleteSubscription, todayKey, toPersianNumber } = useBudgetyar()
const form = reactive({ title: '', endDate: '' })
const editingId = ref<string | undefined>()
const isFormOpen = ref(false)
const formDialog = ref<HTMLDialogElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const activeCount = computed(() => items.value.filter((item) => item.days >= 0).length)
const endDatePicker = computed({
  get: () => {
    const date = parseJalaliInput(form.endDate)
    return date ? toGregorian(date.year, date.month, date.day) : null
  },
  set: (value: string | null) => {
    if (!value) { form.endDate = ''; return }
    const date = toJalali(value)
    form.endDate = `${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`
  },
})
const items = computed(() => subscriptions.value.map((item) => ({
  ...item, days: subscriptionDaysRemaining(item.endDate, todayKey.value),
})).sort((a, b) => Number(a.days < 0) - Number(b.days < 0) || a.endDate.localeCompare(b.endDate)))

function remainingLabel(days: number) {
  if (days < 0) return `‏${toPersianNumber(Math.abs(days))} روز از پایان گذشته`
  if (days === 0) return '‏امروز تمام می‌شود'
  return `‏${toPersianNumber(days)} روز باقی‌مانده`
}

function resetForm() {
  editingId.value = undefined
  form.title = ''
  form.endDate = ''
  isFormOpen.value = false
}

function openForm() {
  resetForm()
  isFormOpen.value = true
}

function edit(item: Subscription) {
  editingId.value = item.id
  form.title = item.title
  form.endDate = item.endDate
  isFormOpen.value = true
}

function submit() {
  if (saveSubscription(form.title, form.endDate, editingId.value)) resetForm()
}

watch(subscriptions, () => {
  if (editingId.value && !subscriptions.value.some((item) => item.id === editingId.value)) resetForm()
})

watch(isFormOpen, async (open, _previous, onCleanup) => {
  if (!open) {
    formDialog.value?.close()
    return
  }
  const previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  onCleanup(() => { document.body.style.overflow = previousOverflow })
  await nextTick()
  if (!isFormOpen.value) return
  formDialog.value?.showModal()
  titleInput.value?.focus()
})

onBeforeUnmount(() => formDialog.value?.close())
</script>

<template>
  <section class="subscriptions-page">
    <header class="subscriptions-header">
      <div class="subscriptions-heading">
        <span class="subscriptions-mark"><Ticket :size="23" aria-hidden="true" /></span>
        <h2>‏اشتراک‌های من</h2>
        <span v-if="activeCount" class="subscriptions-count">{{ toPersianNumber(activeCount) }} ‏فعال</span>
      </div>
      <button class="soft-button subscription-add" type="button" aria-haspopup="dialog" @click="openForm">
        <Plus :size="17" aria-hidden="true" />
        <span>‏اشتراک جدید</span>
      </button>
    </header>

    <dialog ref="formDialog" class="subscription-dialog" dir="rtl" aria-labelledby="subscription-dialog-title" @cancel.prevent="resetForm" @close="resetForm" @click.self="resetForm">
    <form v-if="isFormOpen" id="subscription-form" class="subscription-form" @submit.prevent="submit">
      <div class="subscription-form-header">
        <h3 id="subscription-dialog-title">{{ editingId ? '‏ویرایش اشتراک' : '‏اشتراک جدید' }}</h3>
        <button class="subscription-close" type="button" aria-label="‏بستن" @click="resetForm"><X :size="19" aria-hidden="true" /></button>
      </div>
      <label>
        <span>‏نام اشتراک</span>
        <input ref="titleInput" v-model="form.title" type="text" placeholder="‏مثلاً VPN یا باشگاه" maxlength="120" required />
      </label>
      <label>
        <span>‏تاریخ پایان</span>
        <JalaliDatePicker v-model="endDatePicker" class="date-picker-field" placeholder="‏انتخاب تاریخ پایان" popover-class="date-picker-popover" />
      </label>
      <button class="primary-button subscription-save" type="submit" :disabled="!form.title.trim() || !form.endDate">
        <Check :size="17" aria-hidden="true" />
        {{ editingId ? '‏ذخیره تغییرات' : '‏افزودن اشتراک' }}
      </button>
    </form>
    </dialog>

    <div v-if="items.length" class="subscription-grid">
      <article v-for="item in items" :key="item.id" class="subscription-card" :class="{ 'subscription-card-ending': item.days >= 0 && item.days <= 7, 'subscription-card-expired': item.days < 0 }">
        <div class="subscription-card-top">
          <span class="subscription-icon"><Ticket :size="19" aria-hidden="true" /></span>
          <h3>{{ item.title }}</h3>
          <button class="subscription-delete" type="button" :aria-label="`‏حذف ${item.title}`" @click="deleteSubscription(item.id)">
            <Trash2 :size="16" aria-hidden="true" />
          </button>
        </div>
        <div class="subscription-countdown" role="status" :aria-label="remainingLabel(item.days)">
          <template v-if="item.days > 0">
            <strong aria-hidden="true">{{ toPersianNumber(item.days) }}</strong>
            <span aria-hidden="true">‏روز<br />‏باقی‌مانده</span>
          </template>
          <template v-else>
            <Hourglass :size="27" aria-hidden="true" />
            <div class="subscription-ended">
              <strong>{{ item.days === 0 ? '‏روز آخر' : '‏تمام شده' }}</strong>
              <span>{{ item.days === 0 ? '‏امروز تمام می‌شود' : `‏${toPersianNumber(Math.abs(item.days))} روز از پایان گذشته` }}</span>
            </div>
          </template>
        </div>
        <div class="subscription-card-footer">
          <div class="subscription-date">
            <CalendarDays :size="14" aria-hidden="true" />
            <span>‏پایان <bdi dir="ltr">{{ toPersianDigits(item.endDate) }}</bdi></span>
          </div>
          <button class="subscription-edit" type="button" :aria-label="`‏ویرایش یا تمدید ${item.title}`" @click="edit(item)">
            <span>‏تمدید / ویرایش</span><ArrowUpLeft :size="15" aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>
    <div v-else class="subscriptions-empty">
      <span class="subscriptions-empty-icon"><Sparkles :size="28" aria-hidden="true" /></span>
      <h3>‏جای اشتراک‌هات اینجاست</h3>
      <button v-if="!isFormOpen" class="soft-button subscription-add" type="button" @click="openForm"><Plus :size="16" aria-hidden="true" />‏اولین اشتراک</button>
    </div>
  </section>
</template>

<style scoped>
.subscriptions-page { display: grid; gap: 22px; color: var(--text); }
.subscriptions-header, .subscriptions-heading, .subscription-card-top, .subscription-card-footer { display: flex; align-items: center; gap: 12px; }
.subscriptions-header { justify-content: space-between; flex-wrap: wrap; }
.subscriptions-heading { gap: 10px; flex-wrap: wrap; }
.subscriptions-heading h2 { margin: 0; font-size: 1.15rem; }
.subscriptions-mark, .subscription-icon, .subscriptions-empty-icon { display: grid; place-items: center; flex-shrink: 0; color: var(--muted-2); }
.subscriptions-mark { width: 42px; height: 42px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel-soft); }
.subscriptions-count { font-size: .7rem; color: var(--muted); background: var(--panel-soft); padding: 3px 9px; border-radius: 20px; }
.subscription-add { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: 12px; font-size: .78rem; }
.subscription-dialog { width: min(420px, calc(100vw - 32px)); max-height: calc(100dvh - 40px); padding: 0; margin: auto; overflow-y: auto; color: var(--text); background: var(--panel-strong); border: 1px solid var(--line); border-radius: 22px; box-shadow: 0 24px 80px rgba(0, 0, 0, .4); }
.subscription-dialog::backdrop { background: rgba(2, 6, 23, .65); backdrop-filter: blur(6px); }
.subscription-form { display: grid; gap: 20px; padding: 24px; }
.subscription-form-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.subscription-form-header h3 { margin: 0; font-size: 1rem; }
.subscription-close { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 1px solid var(--line); border-radius: 11px; background: var(--panel-soft); color: var(--muted); cursor: pointer; }
.subscription-close:hover { color: var(--text); }
.subscription-dialog button:focus-visible { outline: 2px solid #a78bfa; outline-offset: 3px; }
.subscription-form :deep(.jalali-date-picker) { max-width: none; }
.subscription-form :deep(.date-picker-popover.jalali-date-picker__popover) { position: relative !important; inset: auto !important; transform: none; width: 100% !important; min-width: 0; margin: 12px 0 0 !important; }
.subscription-form :deep(.jalali-calendar) { width: 100%; }
.subscription-form label { display: grid; gap: 8px; min-width: 0; }
.subscription-form label > span { color: var(--muted); font-size: .75rem; }
.subscription-save { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; border-radius: 12px; }
.subscription-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr)); gap: 14px; }
.subscription-card { --subscription-tone: #a78bfa; position: relative; min-width: 0; padding: 20px; border: 1px solid var(--line); border-radius: 22px; background: radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--subscription-tone) 11%, transparent), transparent 65%), var(--panel); }
.subscription-card-ending { --subscription-tone: #d4a34a; }
.subscription-card-expired { --subscription-tone: var(--muted); }
.subscription-icon { width: 35px; height: 35px; border-radius: 11px; color: var(--subscription-tone); background: color-mix(in srgb, var(--subscription-tone) 12%, transparent); transform: rotate(-8deg); }
.subscription-card h3 { flex: 1; min-width: 0; margin: 0; font-size: .9rem; overflow-wrap: anywhere; }
.subscription-delete, .subscription-edit { display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 0; background: transparent; color: var(--muted); cursor: pointer; font: inherit; }
.subscription-delete { width: 36px; height: 36px; border-radius: 10px; margin-inline-end: -8px; }
.subscription-delete:hover { color: #e37070; background: rgba(227, 112, 112, .1); }
.subscription-countdown { display: flex; align-items: center; gap: 12px; min-height: 112px; color: var(--subscription-tone); }
.subscription-countdown > strong { font-size: clamp(2.7rem, 5vw, 3.5rem); line-height: 1.2; font-weight: 650; letter-spacing: -2px; font-variant-numeric: tabular-nums; }
.subscription-countdown > span { font-size: .76rem; line-height: 1.9; color: var(--muted); }
.subscription-ended { display: grid; gap: 5px; }
.subscription-ended strong { font-size: 1.25rem; }
.subscription-ended span { font-size: .72rem; color: var(--muted); }
.subscription-card-footer { justify-content: space-between; gap: 10px; padding-top: 13px; border-top: 1px dashed var(--line); flex-wrap: wrap; }
.subscription-date { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: .7rem; }
.subscription-edit { min-height: 32px; font-size: .7rem; color: var(--muted-2); }
.subscription-edit:hover { color: var(--text); }
.subscriptions-page button:focus-visible { outline: 2px solid #a78bfa; outline-offset: 4px; }
.subscriptions-empty { display: grid; justify-items: center; gap: 18px; padding: 65px 20px; border: 1px dashed var(--line); border-radius: 22px; }
.subscriptions-empty-icon { width: 64px; height: 64px; border-radius: 22px; color: #a78bfa; background: rgba(167, 139, 250, .1); transform: rotate(-8deg); }
.subscriptions-empty h3 { margin: 0; color: var(--muted-2); font-size: .95rem; font-weight: 500; }
@media (max-width: 600px) {
  .subscriptions-page { gap: 16px; }
  .subscriptions-header { gap: 12px; }
  .subscriptions-heading { gap: 7px; }
  .subscriptions-heading h2 { font-size: 1rem; }
  .subscriptions-mark { width: 34px; height: 34px; border-radius: 11px; }
  .subscription-form { padding: 20px; }
  .subscription-card { padding: 17px; }
  .subscription-countdown { min-height: 100px; }
}
</style>
