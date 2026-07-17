<script setup lang="ts">
import { ArrowDownCircle, ArrowUpCircle, Check, Sparkles, X } from 'lucide-vue-next'

const budgetyar = useBudgetyar()
const {
  isModalOpen,
  formType,
  form,
  formAmountInWords,
  formDatePickerValue,
  categories,
  getCategory,
  matchTransactionCategoryRule,
  formatMoneyInput,
  updateMoneyInput,
  saveTransaction,
} = budgetyar

const suggestedRule = computed(() => {
  if (formType.value !== 'expense' || !form.title) return undefined

  return matchTransactionCategoryRule({
    id: 0,
    type: formType.value,
    title: form.title,
    amount: Number(form.amount),
    date: form.date,
    category: form.category,
    description: form.description,
    paymentMethod: form.paymentMethod,
  })
})

function applySuggestedCategory() {
  if (suggestedRule.value) form.category = suggestedRule.value.categoryId
}
</script>

<template>
  <Transition name="modal">
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="isModalOpen = false">
      <form class="modal transaction-modal glass-panel" @submit.prevent="saveTransaction">
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

          <select v-if="formType === 'expense'" v-model="form.category" aria-label="‏دسته">
            <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
          </select>

          <JalaliDatePicker
            v-model="formDatePickerValue"
            class="date-picker-field"
            placeholder="‏انتخاب تاریخ"
            :clearable="false"
            popover-class="date-picker-popover"
          />

          <div v-if="formType === 'expense'" class="form-inline-grid">
            <select v-model="form.paymentMethod" aria-label="‏روش پرداخت">
              <option value="cash">‏نقدی</option>
              <option value="credit">‏اعتباری</option>
            </select>
            <select v-model="form.isEssential" aria-label="‏نوع خرید">
              <option :value="true">‏ضروری</option>
              <option :value="false">‏غیرضروری</option>
            </select>
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

        <button class="primary-button transaction-submit" type="submit">
          <Check :size="18" aria-hidden="true" />
          <span>{{ formType === 'expense' ? '‏ثبت هزینه' : '‏ثبت درآمد' }}</span>
        </button>
      </form>
    </div>
  </Transition>
</template>
