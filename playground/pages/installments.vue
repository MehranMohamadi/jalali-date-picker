<script setup lang="ts">
import { Check, Pencil, Plus, Trash2, X } from 'lucide-vue-next'

const budgetyar = useBudgetyar()
const {
  installmentForm,
  editingInstallmentId,
  installmentAmountInWords,
  installmentStartDatePickerValue,
  installmentSummaries,
  categories,
  formatMoneyInput,
  formatMoney,
  updateMoneyInput,
  addInstallmentPlan,
  editInstallmentPlan,
  cancelInstallmentEdit,
  payInstallment,
  removeInstallmentPlan,
  getCategory,
  getPaymentMethodLabel,
  toPersianNumber,
  progressPercent,
} = budgetyar
</script>

<template>
  <section class="glass-panel installments-card" data-section="قسط‌ها">
    <div class="section-title">
      <div>
        <h2>قسط‌ها</h2>
        <p>تعریف، پیگیری سررسید و ثبت پرداخت قسط</p>
      </div>
    </div>

    <form class="installment-form" @submit.prevent="addInstallmentPlan">
      <div v-if="editingInstallmentId" class="installment-edit-banner">
        <strong>ویرایش قسط</strong>
        <button class="soft-button" type="button" @click="cancelInstallmentEdit">
          <X :size="16" aria-hidden="true" />
          <span>لغو</span>
        </button>
      </div>
      <label>
        <span>عنوان</span>
        <input v-model="installmentForm.title" type="text" placeholder="مثلا وام لپ‌تاپ" required />
      </label>
      <label>
        <span>مبلغ هر قسط</span>
        <input :value="formatMoneyInput(installmentForm.amount)" type="text" inputmode="numeric" required @input="updateMoneyInput(installmentForm, 'amount', $event)" />
        <small v-if="installmentAmountInWords" class="amount-in-words">{{ installmentAmountInWords }}</small>
      </label>
      <label>
        <span>دسته</span>
        <BudgetyarSelect v-model="installmentForm.category">
          <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>تاریخ شروع</span>
        <JalaliDatePicker
          v-model="installmentStartDatePickerValue"
          class="date-picker-field"
          placeholder="شروع اقساط"
          :clearable="false"
          popover-class="date-picker-popover"
        />
      </label>
      <label>
        <span>روز سررسید</span>
        <input v-model.number="installmentForm.dueDay" type="number" min="1" max="31" required />
      </label>
      <label>
        <span>تعداد اقساط</span>
        <input v-model.number="installmentForm.totalCount" type="number" min="1" required />
      </label>
      <label>
        <span>روش پرداخت</span>
        <BudgetyarSelect v-model="installmentForm.paymentMethod">
          <option value="cash">نقدی</option>
          <option value="credit">اعتباری</option>
        </BudgetyarSelect>
      </label>
      <label class="installment-description">
        <span>توضیحات</span>
        <textarea v-model="installmentForm.description" rows="2" placeholder="اختیاری" />
      </label>
      <button class="primary-button" type="submit">
        <Plus v-if="!editingInstallmentId" :size="17" aria-hidden="true" />
        <Check v-else :size="17" aria-hidden="true" />
        <span>{{ editingInstallmentId ? 'ذخیره ویرایش' : 'افزودن قسط' }}</span>
      </button>
    </form>

    <div v-if="installmentSummaries.length" class="installments-grid">
      <article v-for="item in installmentSummaries" :key="item.id" class="installment-item" :class="item.status">
        <div class="installment-item-head">
          <div>
            <strong>{{ item.title }}</strong>
            <small>{{ getCategory(item.category).icon }} {{ getCategory(item.category).label }} · {{ getPaymentMethodLabel({ ...item, type: 'expense', date: item.startDate }) }}</small>
          </div>
          <span>{{ item.statusLabel }}</span>
        </div>
        <div class="installment-meta">
          <span>مبلغ: {{ formatMoney(item.amount) }}</span>
          <span>سررسید بعدی: {{ item.nextDueDate || 'تمام شده' }}</span>
          <span>{{ toPersianNumber(item.paidCount) }} از {{ toPersianNumber(item.totalCount) }} پرداخت شده</span>
        </div>
        <div class="progress" :class="{ danger: item.status === 'overdue' }">
          <i :style="{ width: `${progressPercent(item.paidCount, item.totalCount)}%` }" />
        </div>
        <p v-if="item.description">{{ item.description }}</p>
        <div class="installment-actions">
          <button class="primary-button" type="button" :disabled="item.status === 'completed'" @click="payInstallment(item)">
            <Check :size="16" aria-hidden="true" />
            <span>پرداخت شد</span>
          </button>
          <button class="soft-button" type="button" @click="editInstallmentPlan(item)">
            <Pencil :size="16" aria-hidden="true" />
            <span>ویرایش</span>
          </button>
          <button class="soft-button" type="button" @click="removeInstallmentPlan(item.id)">
            <Trash2 :size="16" aria-hidden="true" />
            <span>حذف</span>
          </button>
        </div>
      </article>
    </div>

    <EmptyState
      v-else
      compact
      title="هنوز قسطی ثبت نشده است."
      text="اولین قسط ماهانه را از فرم بالا اضافه کنید."
    />
  </section>
</template>
