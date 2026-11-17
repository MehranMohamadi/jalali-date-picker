<script setup lang="ts">
const { amountsHidden, privateText } = usePrivacy()
import { ChevronDown, Plus, Sparkles, X } from 'lucide-vue-next'

const budgetyar = useBudgetyar()
const {
  isModalOpen,
  isMobileViewport,
  editingId,
  formType,
  form,
  formAmountInWords,
  formDatePickerValue,
  categories,
  tags,
  getCategory,
  matchTransactionCategoryRule,
  formatMoneyInput,
  updateMoneyInput,
  saveTransaction,
  toggleSubCategory,
  toPersianNumber,
  addTag,
  deleteTag,
} = budgetyar

const newTagLabel = ref('')
const dialog = ref<HTMLFormElement | null>(null)

watch([isModalOpen, isMobileViewport], async ([open, mobile], previous, onCleanup) => {
  if (!open || !import.meta.client) return
  const previousFocus = document.activeElement as HTMLElement | null
  if (!previous?.[0]) newTagLabel.value = ''
  onCleanup(() => {
    if (mobile) return
    void nextTick(() => {
      if (!isModalOpen.value && !document.querySelector('[aria-modal="true"], dialog[open]')) previousFocus?.focus({ preventScroll: true })
    })
  })
  await nextTick()
  if (isModalOpen.value) dialog.value?.focus({ preventScroll: true })
})

function trapFocus(event: KeyboardEvent) {
  const controls = Array.from(dialog.value?.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), textarea, select, summary, [tabindex="0"]',
  ) ?? []).filter((element) => element.getClientRects().length > 0)
  const first = controls[0]
  const last = controls.at(-1)
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) {
    event.preventDefault()
    first?.focus()
  }
}

function handleAddQuickTag() {
  const trimmed = newTagLabel.value.trim()
  if (!trimmed) return
  const key = addTag(trimmed, '🏷️')
  if (key) {
    if (!form.subCategories.includes(key)) {
      form.subCategories.push(key)
    }
    newTagLabel.value = ''
  }
}

function handleDeleteTag(key: string, event: Event) {
  event.stopPropagation()
  deleteTag(key)
}

const suggestedRule = computed(() => {
  if (formType.value !== 'expense' || !form.title) return undefined

  return matchTransactionCategoryRule({
    id: 0,
    type: formType.value,
    title: form.title,
    amount: Number(form.amount),
    date: form.date,
    category: form.category,
    categories: [form.category],
    description: form.description,
    paymentMethod: form.paymentMethod,
  })
})

function applySuggestedCategory() {
  if (suggestedRule.value) {
    form.category = suggestedRule.value.categoryId
  }
}
</script>

<template>
  <Teleport to="#bottom-nav-transaction-slot" :disabled="!isMobileViewport">
  <Transition :name="isMobileViewport ? 'transaction-inline' : 'modal'" :duration="isMobileViewport ? 260 : undefined">
    <div v-if="isModalOpen" :class="isMobileViewport ? 'transaction-inline-shell' : 'modal-backdrop transaction-backdrop'" @click.self="isModalOpen = false">
      <form ref="dialog" class="modal transaction-modal glass-panel" :role="isMobileViewport ? undefined : 'dialog'" :aria-modal="isMobileViewport ? undefined : 'true'" aria-labelledby="transaction-modal-title" tabindex="-1" @submit.prevent="saveTransaction" @keydown.tab="!isMobileViewport && trapFocus($event)" @keydown.esc="isModalOpen = false">
        <div class="transaction-modal__handle" aria-hidden="true" />
        <div class="transaction-modal__header">
          <div>
            <h2 id="transaction-modal-title">{{ editingId !== null ? '‏ویرایش تراکنش' : formType === 'expense' ? '‏ثبت هزینه جدید' : '‏ثبت درآمد جدید' }}</h2>
          </div>
          <button class="close" type="button" aria-label="‏بستن" @click="isModalOpen = false">
            <X :size="18" aria-hidden="true" />
          </button>
        </div>

        <div class="transaction-modal__body">
          <div class="transaction-type-switch" role="group" aria-label="‏نوع تراکنش">
            <button type="button" :class="{ active: formType === 'expense' }" :aria-pressed="formType === 'expense'" @click="formType = 'expense'">
              <span>‏هزینه</span>
            </button>
            <button type="button" :class="{ active: formType === 'income' }" :aria-pressed="formType === 'income'" @click="formType = 'income'">
              <span>‏درآمد</span>
            </button>
          </div>
        <label class="amount-field transaction-amount">
          <span class="transaction-amount__label">‏مبلغ (تومان)</span>
          <div class="transaction-amount__value">
          <input :disabled="amountsHidden"
            :value="amountsHidden ? '••••' : formatMoneyInput(form.amount)"
            type="text"
            inputmode="numeric"
            placeholder="۰"
            aria-label="‏مبلغ"
            required
            @input="updateMoneyInput(form, 'amount', $event)"
          />
          </div>
        </label>
        <small v-if="formAmountInWords" class="amount-in-words">{{ privateText(formAmountInWords) }}</small>

        <div class="transaction-fields">
          <label class="transaction-field">
            <span>‏عنوان</span>
            <input v-model="form.title" type="text" :placeholder="formType === 'expense' ? '‏مثلاً خرید روزانه' : '‏مثلاً حقوق ماهانه'" required />
          </label>

          <div v-if="suggestedRule" class="rule-suggestion inline-rule-suggestion" aria-live="polite">
            <span>
              <Sparkles :size="16" aria-hidden="true" />
              ‏دسته پیشنهادی: {{ getCategory(suggestedRule.categoryId).icon }} {{ getCategory(suggestedRule.categoryId).label }}
            </span>
            <button v-if="suggestedRule.categoryId !== form.category" class="soft-button" type="button" @click="applySuggestedCategory">‏تأیید دسته</button>
            <small v-else class="rule-suggestion-confirmed">‏انتخاب شد ✓</small>
          </div>

          <div v-if="formType === 'expense'" class="category-selection-container">
            <div class="primary-category-field transaction-field">
              <span class="category-field-label">‏دسته اصلی، محاسبه در بودجه</span>
              <BudgetyarSelect v-model="form.category" aria-label="‏دسته اصلی">
                <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
              </BudgetyarSelect>
            </div>

            <details class="subcategories-container">
              <summary class="subcategories-header">
                <span class="subcategories-title">
                  <small>‏برچسب‌ها · اختیاری</small>
                  <span>‏افزودن برچسب</span>
                </span>
                <span v-if="form.subCategories.length" class="subcategories-badge">
                  {{ toPersianNumber(form.subCategories.length) }} ‏انتخاب‌شده
                </span>
                <ChevronDown :size="16" class="subcategories-chevron" aria-hidden="true" />
              </summary>

              <div class="subcategories-content">
              <div class="quick-tag-creator">
                <input
                  v-model="newTagLabel"
                  type="text"
                  placeholder="‏تعریف برچسب جدید..."
                  class="quick-tag-input"
                  aria-label="‏نام برچسب جدید"
                  maxlength="40"
                  @keydown.enter.prevent="handleAddQuickTag"
                />
                <button
                  type="button"
                  class="quick-tag-btn"
                  :disabled="!newTagLabel.trim()"
                  aria-label="‏افزودن برچسب جدید"
                  @click="handleAddQuickTag"
                >
                  <Plus :size="14" aria-hidden="true" />
                  <span>‏افزودن</span>
                </button>
              </div>

              <div v-if="tags.length" class="subcategories-chips" role="group" aria-label="‏تگ‌ها">
                <div
                  v-for="cat in tags"
                  :key="cat.key"
                  class="subcategory-chip-item"
                >
                  <button
                    type="button"
                    class="subcategory-chip"
                    :class="{ active: form.subCategories.includes(cat.key) }"
                    :aria-pressed="form.subCategories.includes(cat.key)"
                    @click="toggleSubCategory(cat.key)"
                  >
                    <span class="subcategory-chip__icon" aria-hidden="true">{{ cat.icon }}</span>
                    <span class="subcategory-chip__label">{{ cat.label }}</span>
                    <span class="subcategory-chip__indicator" aria-hidden="true">
                      {{ form.subCategories.includes(cat.key) ? '✓' : '+' }}
                    </span>
                  </button>
                  <button
                    type="button"
                    class="subcategory-chip-delete"
                    :aria-label="`حذف کامل برچسب ${cat.label}`"
                    title="‏حذف کامل برچسب"
                    @click="handleDeleteTag(cat.key, $event)"
                  >
                    <X :size="11" aria-hidden="true" />
                  </button>
                </div>
              </div>
              </div>
            </details>
          </div>

          <div class="transaction-field">
          <span>‏تاریخ</span>
          <JalaliDatePicker
            v-model="formDatePickerValue"
            class="date-picker-field"
            placeholder="‏انتخاب تاریخ"
            :clearable="false"
            popover-class="date-picker-popover"
          />
          </div>

          <div v-if="formType === 'expense'" class="form-inline-grid">
            <div class="transaction-field">
            <span>‏روش پرداخت</span>
            <BudgetyarSelect v-model="form.paymentMethod" aria-label="‏روش پرداخت">
              <option value="cash">‏نقدی</option>
              <option value="credit">‏اعتباری</option>
            </BudgetyarSelect>
            </div>
            <div class="transaction-field">
            <span>‏نوع هزینه</span>
            <BudgetyarSelect v-model="form.isEssential" aria-label="‏نوع خرید">
              <option :value="true">‏ضروری</option>
              <option :value="false">‏غیرضروری</option>
            </BudgetyarSelect>
            </div>
          </div>

          <div v-if="formType === 'expense'" class="transaction-field transaction-loan">
            <span>‏قرض به دیگران</span>
            <label class="check-row compact-check">
              <input v-model="form.isLoan" type="checkbox" aria-label="‏قرض به دیگران" />
            </label>
            <input
            v-if="form.isLoan"
            v-model="form.loanPerson"
            type="text"
            placeholder="‏نام شخص"
            aria-label="‏نام شخص"
            required
          />
          </div>

          <label class="transaction-field">
            <span>‏توضیحات · اختیاری</span>
            <textarea v-model="form.description" rows="2" placeholder="‏توضیحی برای این تراکنش..." />
          </label>
        </div>
        </div>

        <div class="transaction-modal__footer">
          <button class="primary-button transaction-submit" type="submit">
            <span>{{ editingId !== null ? '‏ذخیره تغییرات' : '‏ثبت تراکنش' }}</span>
          </button>
        </div>
      </form>
    </div>
  </Transition>
  </Teleport>
</template>

<style scoped>
.transaction-backdrop {
  background: #09090bb8;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
form.transaction-modal {
  background: var(--bg) !important;
  border: 1px solid var(--line-strong);
  border-radius: 24px;
  width: min(460px, 100%);
  outline: none;
}
.transaction-modal__handle { display: none; }
.transaction-modal__header {
  background: transparent;
  border: 0;
  flex: 0 0 auto;
  padding: 20px 20px 16px;
}
.transaction-modal__header h2 { color: var(--text); font-size: 1.05rem; font-weight: 650; margin: 0; }
.transaction-modal .close { background: var(--panel-soft); border: 1px solid var(--line); border-radius: 50%; color: var(--muted-2); flex-shrink: 0; }
.transaction-modal__body { padding: 0 20px 16px; }
.transaction-type-switch { background: transparent; border: 0; gap: 8px; padding: 0; }
.transaction-type-switch button { background: var(--panel-soft); border: 1px solid var(--line-strong); box-shadow: none; border-radius: 16px; font-size: .8125rem; margin: 0; min-height: 44px; padding: 8px; transform: none; }
.transaction-type-switch button.active { background: var(--primary); border-color: var(--primary); color: var(--on-primary); box-shadow: none; }
.transaction-modal .transaction-amount { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; box-shadow: none; gap: 4px; margin: 12px 0; padding: 14px 16px; text-align: right; }
.transaction-amount .transaction-amount__label { color: var(--muted); font-size: .6875rem; font-weight: 400; }
.transaction-amount__value { min-width: 0; }
.transaction-modal .transaction-amount input[type='text'][inputmode='numeric'] { color: var(--text); direction: ltr; font-size: 1rem; font-weight: 500; min-height: 28px; min-width: 0; text-align: right; width: 100%; }
.transaction-modal .amount-in-words { color: var(--muted); display: block; font-size: .6875rem; margin: 0 0 16px; overflow-wrap: anywhere; text-align: right; }
.transaction-fields { gap: 12px; padding: 0; }
.transaction-modal .form-inline-grid { grid-template-columns: minmax(0, 1fr); gap: 12px; }
.transaction-modal .transaction-field { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; display: grid; gap: 6px; margin: 0; min-width: 0; padding: 14px 16px; }
.transaction-field > span, .transaction-modal .category-field-label { color: var(--muted); font-size: .6875rem; font-weight: 400; }
.transaction-modal :is(input:not([type='checkbox']), textarea), .transaction-modal :deep(.budgetyar-select-trigger) { background: var(--bg-2); border-color: var(--line); border-radius: 11px; color: var(--text); min-height: 44px; }
.transaction-modal .transaction-amount input { background: transparent; border: 0; border-radius: 0; }
.transaction-modal .transaction-field :is(input:not([type='checkbox']), textarea), .transaction-modal .transaction-field :deep(.budgetyar-select-trigger) { background: transparent; border: 0; border-radius: 6px; box-shadow: none; min-height: 28px; padding: 0; }
.transaction-modal .transaction-field :deep(.budgetyar-select-chevron) { color: var(--muted); width: 14px; }
.transaction-modal :is(input, textarea):focus-visible, .transaction-modal :deep(button:focus-visible) { outline: 2px solid var(--primary); outline-offset: 2px; }
.transaction-modal :deep(.budgetyar-select-menu) { background: var(--panel-strong); border-color: var(--line-strong); }
.transaction-modal :deep(.budgetyar-select-option.selected) { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.transaction-modal .date-picker-field { background: transparent; max-width: none; width: 100%; }
.transaction-modal .transaction-field :deep(.jalali-date-picker__input) { background: transparent !important; border: 0 !important; border-radius: 6px !important; box-shadow: none !important; min-height: 28px; padding-block: 0 !important; padding-inline-start: 0; }
.transaction-modal .subcategories-container { background: var(--panel); border-color: var(--line-strong); border-radius: 18px; }
.transaction-modal .subcategories-header { min-height: 78px; padding: 14px 16px; }
.transaction-modal .subcategories-title { display: grid; gap: 10px; font-weight: 400; }
.transaction-modal .subcategories-title small { font-size: .6875rem; }
.transaction-modal .subcategories-title > span { color: var(--text); font-size: .8125rem; }
.transaction-modal .compact-check { background: transparent; border: 0; border-radius: 0; font-size: .75rem; min-height: 28px; padding: 0; }
.transaction-modal .transaction-field textarea { min-height: 28px; resize: vertical; }
.transaction-modal__footer { background: var(--bg); border: 0; display: grid; gap: 10px; padding: 12px 20px 16px; }
.transaction-modal .transaction-submit { background: var(--primary) !important; border: 0; border-radius: 12px; box-shadow: none; color: var(--on-primary); font-size: .875rem; font-weight: 600; min-height: 46px; }
.transaction-modal .rule-suggestion { background: var(--panel); border-color: var(--line-strong); color: var(--text); }
.transaction-modal .rule-suggestion-confirmed { color: var(--success); }
@media (max-width: 760px) {
  .transaction-inline-shell { min-width: 0; }
  form.transaction-modal { background: var(--panel) !important; border: 0; border-radius: 0; max-height: calc(100dvh - 112px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); width: 100%; }
  .transaction-modal__header { padding: 14px 16px; }
  .transaction-modal__body { padding-inline: 16px; }
  .transaction-modal__footer { background: var(--panel); padding: 12px 16px; }
  .transaction-inline-enter-active, .transaction-inline-leave-active { transition: opacity .26s ease; transition-duration: .26s !important; }
  .transaction-inline-enter-from, .transaction-inline-leave-to { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .transaction-inline-enter-active, .transaction-inline-leave-active { transition: none; transition-duration: 0s !important; }
}
</style>
