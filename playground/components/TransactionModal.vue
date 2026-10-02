<script setup lang="ts">
import { ArrowDownCircle, ArrowUpCircle, Check, ChevronDown, Plus, Sparkles, X } from 'lucide-vue-next'

const budgetyar = useBudgetyar()
const {
  isModalOpen,
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
  <Transition name="modal">
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="isModalOpen = false">
      <form class="modal transaction-modal glass-panel" @submit.prevent="saveTransaction" @keydown.esc="isModalOpen = false">
        <div class="transaction-modal__header compact">
          <div class="transaction-type-switch" role="group" aria-label="‏نوع تراکنش">
            <button type="button" :class="{ active: formType === 'expense' }" @click="formType = 'expense'">
              <ArrowDownCircle :size="17" aria-hidden="true" />
              <span>‏هزینه</span>
            </button>
            <button type="button" :class="{ active: formType === 'income' }" @click="formType = 'income'">
              <ArrowUpCircle :size="17" aria-hidden="true" />
              <span>‏درآمد</span>
            </button>
          </div>
          <button class="close" type="button" aria-label="‏بستن" @click="isModalOpen = false">
            <X :size="18" aria-hidden="true" />
          </button>
        </div>

        <div class="transaction-modal__body">
        <label class="amount-field transaction-amount">
          <input
            :value="formatMoneyInput(form.amount)"
            type="text"
            inputmode="numeric"
            placeholder="‏مبلغ"
            aria-label="‏مبلغ"
            required
            @input="updateMoneyInput(form, 'amount', $event)"
          />
          <small v-if="formAmountInWords" class="amount-in-words">{{ formAmountInWords }}</small>
        </label>

        <div class="transaction-fields">
          <input v-model="form.title" type="text" placeholder="‏عنوان" aria-label="‏عنوان" required />

          <div v-if="suggestedRule" class="rule-suggestion inline-rule-suggestion" aria-live="polite">
            <span>
              <Sparkles :size="16" aria-hidden="true" />
              ‏دسته پیشنهادی: {{ getCategory(suggestedRule.categoryId).icon }} {{ getCategory(suggestedRule.categoryId).label }}
            </span>
            <button v-if="suggestedRule.categoryId !== form.category" class="soft-button" type="button" @click="applySuggestedCategory">‏تأیید دسته</button>
            <small v-else class="rule-suggestion-confirmed">‏انتخاب شد ✓</small>
          </div>

          <div v-if="formType === 'expense'" class="category-selection-container">
            <div class="primary-category-field">
              <label class="category-field-label">‏دسته اصلی (محاسبه در بودجه)</label>
              <BudgetyarSelect v-model="form.category" aria-label="‏دسته اصلی">
                <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
              </BudgetyarSelect>
            </div>

            <details class="subcategories-container">
              <summary class="subcategories-header">
                <span class="subcategories-title">‏تگ‌ها <small>‏اختیاری</small></span>
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

          <JalaliDatePicker
            v-model="formDatePickerValue"
            class="date-picker-field"
            placeholder="‏انتخاب تاریخ"
            :clearable="false"
            popover-class="date-picker-popover"
          />

          <div v-if="formType === 'expense'" class="form-inline-grid">
            <BudgetyarSelect v-model="form.paymentMethod" aria-label="‏روش پرداخت">
              <option value="cash">‏نقدی</option>
              <option value="credit">‏اعتباری</option>
            </BudgetyarSelect>
            <BudgetyarSelect v-model="form.isEssential" aria-label="‏نوع خرید">
              <option :value="true">‏ضروری</option>
              <option :value="false">‏غیرضروری</option>
            </BudgetyarSelect>
          </div>

          <label v-if="formType === 'expense'" class="check-row compact-check">
            <input v-model="form.isLoan" type="checkbox" />
            <span>‏پولی که قرض دادم</span>
          </label>

          <input
            v-if="formType === 'expense' && form.isLoan"
            v-model="form.loanPerson"
            type="text"
            placeholder="‏نام شخص"
            aria-label="‏نام شخص"
          />

          <textarea v-model="form.description" rows="1" placeholder="‏توضیحات اختیاری" aria-label="‏توضیحات" />
        </div>
        </div>

        <div class="transaction-modal__footer">
          <button class="primary-button transaction-submit" type="submit">
            <Check :size="18" aria-hidden="true" />
            <span>{{ formType === 'expense' ? '‏ثبت هزینه' : '‏ثبت درآمد' }}</span>
          </button>
        </div>
      </form>
    </div>
  </Transition>
</template>
