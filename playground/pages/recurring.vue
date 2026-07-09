<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  recurringForm,
  editingRecurringItemId,
  recurringAmountInWords,
  recurringStartDatePickerValue,
  recurringEndDatePickerValue,
  recurringSummaries,
  dueRecurringItems,
  overdueRecurringItems,
  upcomingRecurringItems,
  categories,
  monthlyRecurringIncomeTotal,
  monthlyRecurringExpenseTotal,
  monthlySubscriptionsTotal,
  formatMoneyInput,
  formatMoney,
  updateMoneyInput,
  addRecurringItem,
  editRecurringItem,
  deleteRecurringItem,
  toggleRecurringItem,
  markRecurringItemPaid,
  skipRecurringOccurrence,
  getCategory,
} = budgetyar

const nearItems = computed(() => [...overdueRecurringItems.value, ...dueRecurringItems.value, ...upcomingRecurringItems.value])

function frequencyLabel(value: string) {
  if (value === 'daily') return 'روزانه'
  if (value === 'weekly') return 'هفتگی'
  if (value === 'yearly') return 'سالانه'
  return 'ماهانه'
}
</script>

<template>
  <section class="glass-panel settings-card">
    <div class="section-title">
      <div>
        <h2>پرداخت‌های تکراری</h2>
        <p>درآمد ثابت، قبض، اشتراک و هزینه‌های دوره‌ای</p>
      </div>
    </div>

    <div class="report-grid">
      <span><small>درآمد تکراری ماه</small><strong>{{ formatMoney(monthlyRecurringIncomeTotal) }}</strong></span>
      <span><small>هزینه ثابت ماه</small><strong>{{ formatMoney(monthlyRecurringExpenseTotal) }}</strong></span>
      <span><small>اشتراک‌ها</small><strong>{{ formatMoney(monthlySubscriptionsTotal) }}</strong></span>
      <span><small>نزدیک سررسید</small><strong>{{ nearItems.length }}</strong></span>
    </div>

    <form class="installment-form planning-form" @submit.prevent="addRecurringItem">
      <div v-if="editingRecurringItemId" class="installment-edit-banner">
        <strong>ویرایش تکراری</strong>
      </div>
      <label>
        <span>عنوان</span>
        <input v-model="recurringForm.title" placeholder="مثلا اینترنت" required />
      </label>
      <label>
        <span>نوع</span>
        <select v-model="recurringForm.type">
          <option value="expense">هزینه</option>
          <option value="income">درآمد</option>
        </select>
      </label>
      <label>
        <span>مبلغ</span>
        <input :value="formatMoneyInput(recurringForm.amount)" inputmode="numeric" required @input="updateMoneyInput(recurringForm, 'amount', $event)" />
        <small v-if="recurringAmountInWords" class="amount-in-words">{{ recurringAmountInWords }}</small>
      </label>
      <label>
        <span>دسته</span>
        <select v-model="recurringForm.categoryId" :disabled="recurringForm.type === 'income'">
          <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
        </select>
      </label>
      <label>
        <span>تناوب</span>
        <select v-model="recurringForm.frequency">
          <option value="daily">روزانه</option>
          <option value="weekly">هفتگی</option>
          <option value="monthly">ماهانه</option>
          <option value="yearly">سالانه</option>
        </select>
      </label>
      <label>
        <span>شروع</span>
        <JalaliDatePicker v-model="recurringStartDatePickerValue" class="date-picker-field" :clearable="false" popover-class="date-picker-popover" />
      </label>
      <label>
        <span>پایان</span>
        <JalaliDatePicker v-model="recurringEndDatePickerValue" class="date-picker-field" placeholder="اختیاری" popover-class="date-picker-popover" />
      </label>
      <label>
        <span>روز سررسید</span>
        <input v-model.number="recurringForm.dueDay" type="number" min="1" max="31" :disabled="recurringForm.frequency !== 'monthly'" />
      </label>
      <label>
        <span>روش پرداخت</span>
        <select v-model="recurringForm.paymentMethod" :disabled="recurringForm.type === 'income'">
          <option value="cash">نقدی</option>
          <option value="credit">اعتباری</option>
        </select>
      </label>
      <label>
        <span>یادآوری چند روز قبل</span>
        <input v-model.number="recurringForm.reminderDaysBefore" type="number" min="0" max="30" />
      </label>
      <label class="check-row">
        <input v-model="recurringForm.isSubscription" type="checkbox" />
        <span>اشتراک است</span>
      </label>
      <label class="check-row">
        <input v-model="recurringForm.isActive" type="checkbox" />
        <span>فعال است</span>
      </label>
      <label class="installment-description">
        <span>توضیح</span>
        <textarea v-model="recurringForm.note" rows="2" placeholder="اختیاری" />
      </label>
      <button class="primary-button" type="submit">{{ editingRecurringItemId ? 'ذخیره' : 'افزودن' }}</button>
    </form>

    <section v-if="nearItems.length" class="weekly-category-budget glass-panel planning-inline">
      <div class="weekly-category-head">
        <strong>نزدیک سررسید</strong>
        <small>ثبت پرداخت با تایید شما انجام می‌شود</small>
      </div>
      <div class="weekly-category-list">
        <span v-for="item in nearItems.slice(0, 5)" :key="item.id">
          <b>{{ item.title }}</b>
          <em>{{ item.nextDueDate }} · {{ formatMoney(item.amount) }}</em>
          <button class="primary-button" type="button" @click="markRecurringItemPaid(item)">ثبت</button>
          <button class="soft-button" type="button" @click="skipRecurringOccurrence(item)">رد</button>
        </span>
      </div>
    </section>

    <div v-if="recurringSummaries.length" class="installments-grid planning-card-grid">
      <article v-for="item in recurringSummaries" :key="item.id" class="installment-item" :class="item.status">
        <div class="installment-item-head">
          <div>
            <strong>{{ item.title }}</strong>
            <small>{{ item.type === 'income' ? 'درآمد' : getCategory(item.categoryId).label }} · {{ frequencyLabel(item.frequency) }}</small>
          </div>
          <span>{{ item.statusLabel }}</span>
        </div>
        <div class="installment-meta">
          <span>مبلغ: {{ formatMoney(item.amount) }}</span>
          <span>سررسید بعدی: {{ item.nextDueDate || 'ندارد' }}</span>
          <span>{{ item.isSubscription ? 'اشتراک' : 'هزینه ثابت' }}</span>
        </div>
        <p v-if="item.note">{{ item.note }}</p>
        <div class="installment-actions">
          <button class="primary-button" type="button" @click="markRecurringItemPaid(item)">پرداخت شد</button>
          <button class="soft-button" type="button" @click="toggleRecurringItem(item.id)">{{ item.isActive ? 'غیرفعال' : 'فعال' }}</button>
          <button class="soft-button" type="button" @click="editRecurringItem(item)">ویرایش</button>
          <button class="soft-button" type="button" @click="deleteRecurringItem(item.id)">حذف</button>
        </div>
      </article>
    </div>

    <EmptyState v-else compact title="هنوز پرداخت تکراری نداری." text="حقوق، اجاره یا اشتراک‌ها را از فرم بالا اضافه کن." />
  </section>
</template>
