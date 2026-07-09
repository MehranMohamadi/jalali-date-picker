<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  isModalOpen,
  editingId,
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
  if (formType.value !== 'expense' || !form.title || !form.amount) return undefined

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
        <div class="section-title">
          <div>
            <h2>{{ editingId ? 'ویرایش تراکنش' : 'ثبت تراکنش' }}</h2>
          </div>
          <button class="close" type="button" @click="isModalOpen = false">×</button>
        </div>
        <div class="segmented">
          <button type="button" :class="{ active: formType === 'expense' }" @click="formType = 'expense'">ثبت هزینه</button>
          <button type="button" :class="{ active: formType === 'income' }" @click="formType = 'income'">ثبت درآمد</button>
        </div>
        <label class="amount-field">
          مبلغ
          <input :value="formatMoneyInput(form.amount)" type="text" inputmode="numeric" required @input="updateMoneyInput(form, 'amount', $event)" />
          <small v-if="formAmountInWords" class="amount-in-words">{{ formAmountInWords }}</small>
        </label>
        <label>عنوان <input v-model="form.title" type="text" required /></label>
        <label v-if="formType === 'expense'">دسته بندی
          <select v-model="form.category">
            <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
          </select>
        </label>
        <div v-if="suggestedRule && suggestedRule.categoryId !== form.category" class="rule-suggestion">
          <span>دسته پیشنهادی: {{ getCategory(suggestedRule.categoryId).label }}</span>
          <button class="soft-button" type="button" @click="applySuggestedCategory">اعمال</button>
        </div>
        <div v-if="formType === 'expense'" class="form-inline-grid">
          <label>روش پرداخت
            <select v-model="form.paymentMethod">
              <option value="cash">نقدی</option>
              <option value="credit">اعتباری</option>
            </select>
          </label>
          <label>نوع خرید
            <select v-model="form.isEssential">
              <option :value="true">ضروری</option>
              <option :value="false">غیرضروری</option>
            </select>
          </label>
        </div>
        <label v-if="formType === 'expense'" class="check-row">
          <input v-model="form.isLoan" type="checkbox" />
          پولی که قرض دادم
        </label>
        <label v-if="formType === 'expense' && form.isLoan">نام شخص
          <input v-model="form.loanPerson" type="text" placeholder="مثلا علی" />
        </label>
        <label>تاریخ
          <JalaliDatePicker
            v-model="formDatePickerValue"
            class="date-picker-field"
            placeholder="انتخاب تاریخ"
            :clearable="false"
            popover-class="date-picker-popover"
          />
        </label>
        <label>توضیحات <textarea v-model="form.description" rows="2" placeholder="اختیاری" /></label>
        <button class="primary-button full" type="submit">{{ formType === 'expense' ? 'ثبت هزینه' : 'ثبت درآمد' }}</button>
      </form>
    </div>
  </Transition>
</template>
