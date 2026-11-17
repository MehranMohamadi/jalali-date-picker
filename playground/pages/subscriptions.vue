<script setup lang="ts">
import { Check, Plus, Sparkles, Trash2, X } from 'lucide-vue-next'
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
const endingCount = computed(() => items.value.filter((item) => item.days >= 0 && item.days <= 7).length)
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
const groups = computed(() => [
  { key: 'ending', title: '‏نزدیک پایان', items: items.value.filter((item) => item.days >= 0 && item.days <= 7) },
  { key: 'active', title: '‏فعال', items: items.value.filter((item) => item.days > 7) },
  { key: 'expired', title: '‏پایان‌یافته', items: items.value.filter((item) => item.days < 0) },
])

function remainingLabel(days: number) {
  if (days < 0) return `‏${toPersianNumber(Math.abs(days))} روز گذشته`
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

async function requestDelete() {
  const id = editingId.value
  if (!id) return
  // Leave the native modal before opening the app's confirmation sheet.
  resetForm()
  await nextTick()
  deleteSubscription(id)
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
  <section class="subscriptions-page" aria-label="‏اشتراک‌های من">
    <div class="subscription-metrics">
      <div><small>‏اشتراک فعال</small><strong>{{ toPersianNumber(activeCount) }}</strong></div>
      <div><small>‏نزدیک پایان</small><strong>{{ toPersianNumber(endingCount) }}</strong></div>
    </div>
    <p class="subscriptions-note">‏زمان پایان اشتراک‌ها را دنبال کن؛ پرداخت‌های تکراری در بخش جداگانه‌اند.</p>
    <button class="primary-button subscription-add" type="button" aria-haspopup="dialog" @click="openForm">‏اشتراک جدید</button>

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
      <button v-if="editingId" class="soft-button subscription-remove" type="button" @click="requestDelete">
        <Trash2 :size="16" aria-hidden="true" />
        <span>‏حذف اشتراک</span>
      </button>
    </form>
    </dialog>

    <div v-if="items.length" class="subscription-groups">
      <section v-for="group in groups" :key="group.key" class="glass-panel subscription-group" :class="`subscription-group-${group.key}`" :aria-labelledby="`subscription-group-${group.key}`">
        <h2 :id="`subscription-group-${group.key}`">{{ group.title }}</h2>
        <div v-if="group.items.length" class="subscription-group-list">
          <button v-for="item in group.items" :key="item.id" class="subscription-row" type="button" aria-haspopup="dialog" :aria-label="`‏ویرایش یا تمدید ${item.title}، ${remainingLabel(item.days)}`" @click="edit(item)">
            <span class="subscription-row-title">
              <strong>{{ item.title }}</strong>
              <small>{{ item.days < 0 ? '‏پایان:' : '‏تا' }} <bdi dir="ltr">{{ toPersianDigits(item.endDate) }}</bdi></small>
            </span>
            <span class="subscription-remaining">{{ remainingLabel(item.days) }}</span>
          </button>
        </div>
        <p v-else class="subscription-group-empty">‏اشتراکی در این بخش نیست.</p>
        <button v-if="group.key === 'ending' && group.items.length === 1" class="soft-button subscription-group-action" type="button" aria-haspopup="dialog" @click="edit(group.items[0])">‏ویرایش اشتراک</button>
        <button v-if="group.key === 'expired' && group.items.length === 1" class="soft-button subscription-group-action" type="button" @click="deleteSubscription(group.items[0].id)">‏حذف اشتراک</button>
      </section>
    </div>
    <div v-else class="subscriptions-empty">
      <span class="subscriptions-empty-icon"><Sparkles :size="28" aria-hidden="true" /></span>
      <h3>‏جای اشتراک‌هات اینجاست</h3>
      <button v-if="!isFormOpen" class="soft-button subscription-add" type="button" @click="openForm"><Plus :size="16" aria-hidden="true" />‏اولین اشتراک</button>
    </div>
  </section>
</template>

<style scoped>
.subscriptions-page { display: grid; gap: 12px; color: var(--text); min-width: 0; }
.subscription-metrics { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.subscription-metrics > div { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; display: grid; gap: 12px; min-width: 0; padding: 14px; }
.subscription-metrics small { color: var(--muted); font-size: .6875rem; }
.subscription-metrics strong { color: var(--text); font-size: 1.1rem; font-weight: 600; }
.subscriptions-note { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 16px; color: var(--muted); font-size: .6875rem; line-height: 1.8; margin: 0; padding: 10px 12px; }
.subscription-add { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: 12px; font-size: .78rem; }
.subscriptions-page > .subscription-add { min-height: 44px; width: 100%; }
.subscription-groups { align-items: start; display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.subscriptions-page .subscription-group { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; min-width: 0; padding: 14px; }
.subscription-group h2 { color: var(--text); font-size: .9rem; font-weight: 600; margin: 0 0 14px; }
.subscription-group-list { display: grid; gap: 10px; }
.subscription-row { align-items: center; background: transparent; border: 1px solid var(--line-strong); border-radius: 17px; color: var(--text); cursor: pointer; display: flex; gap: 12px; justify-content: space-between; min-height: 78px; padding: 12px 14px; text-align: right; width: 100%; }
.subscription-row-title { display: grid; gap: 10px; min-width: 0; }
.subscription-row-title strong { font-size: .8125rem; font-weight: 500; overflow-wrap: anywhere; }
.subscription-row-title small { color: var(--muted); font-size: .625rem; line-height: 1.8; }
.subscription-remaining { color: var(--primary); flex-shrink: 0; font-size: .6875rem; line-height: 1.8; max-width: 45%; text-align: left; }
.subscriptions-page .subscription-group-action { display: flex; justify-content: center; margin-top: 10px; min-height: 42px; width: 100%; }
.subscription-group-empty { color: var(--muted); font-size: .75rem; line-height: 1.8; margin: 0; }
.subscription-dialog { width: min(420px, calc(100vw - 32px)); max-height: calc(100dvh - 40px); padding: 0; margin: auto; overflow-y: auto; color: var(--text); background: var(--panel-strong); border: 1px solid var(--line); border-radius: 22px; box-shadow: 0 24px 80px rgba(0, 0, 0, .4); }
.subscription-dialog::backdrop { background: rgba(2, 6, 23, .65); backdrop-filter: blur(6px); }
.subscription-form { display: grid; gap: 20px; padding: 24px; }
.subscription-form-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.subscription-form-header h3 { margin: 0; font-size: 1rem; }
.subscription-close { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 1px solid var(--line); border-radius: 11px; background: var(--panel-soft); color: var(--muted); cursor: pointer; }
.subscription-close:hover { color: var(--text); }
.subscription-dialog button:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.subscription-form :deep(.jalali-date-picker) { max-width: none; }
.subscription-form :deep(.date-picker-popover.jalali-date-picker__popover) { position: relative !important; inset: auto !important; transform: none; width: 100% !important; min-width: 0; margin: 12px 0 0 !important; }
.subscription-form :deep(.jalali-calendar) { width: 100%; }
.subscription-form label { display: grid; gap: 8px; min-width: 0; }
.subscription-form label > span { color: var(--muted); font-size: .75rem; }
.subscription-save { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; border-radius: 12px; }
.subscription-remove { align-items: center; color: var(--danger); display: flex; gap: 6px; justify-content: center; min-height: 42px; }
.subscriptions-page button:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.subscriptions-empty { display: grid; justify-items: center; gap: 18px; padding: 65px 20px; border: 1px dashed var(--line); border-radius: 22px; }
.subscriptions-empty-icon { align-items: center; background: var(--panel-soft); border-radius: 22px; color: var(--primary); display: flex; height: 64px; justify-content: center; width: 64px; }
.subscriptions-empty h3 { margin: 0; color: var(--muted-2); font-size: .95rem; font-weight: 500; }
@media (max-width: 760px) {
  .subscription-groups { grid-template-columns: minmax(0, 1fr); }
  .subscription-form { padding: 20px; }
}
</style>
