<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  recurringForm,
  editingRecurringItemId,
  recurringAmountInWords,
  recurringStartDatePickerValue,
  recurringEndDatePickerValue,
  recurringSummaries,
  subscriptionSummaries,
  generalRecurringSummaries,
  activeSubscriptionSummaries,
  nearDueSubscriptions,
  dueRecurringItems,
  overdueRecurringItems,
  upcomingRecurringItems,
  categories,
  monthlyRecurringIncomeTotal,
  monthlyRecurringExpenseTotal,
  monthlySubscriptionsTotal,
  annualSubscriptionsTotal,
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
  resetRecurringForm,
} = budgetyar

const activeTab = ref<'subscriptions' | 'recurring'>('subscriptions')

const nearItems = computed(() => [...overdueRecurringItems.value, ...dueRecurringItems.value, ...upcomingRecurringItems.value])
const generalNearItems = computed(() => nearItems.value.filter((item) => !item.isSubscription))

const monthlyEquivalentAmount = computed(() => {
  const amount = Number(recurringForm.amount) || 0
  if (!amount) return 0
  if (recurringForm.frequency === 'yearly') return Math.round(amount / 12)
  if (recurringForm.frequency === 'biannual') return Math.round(amount / 6)
  if (recurringForm.frequency === 'quarterly') return Math.round(amount / 3)
  return amount
})

function switchTab(tab: 'subscriptions' | 'recurring') {
  activeTab.value = tab
  if (!editingRecurringItemId.value) {
    resetRecurringForm(tab === 'subscriptions')
    if (tab === 'subscriptions') {
      recurringForm.frequency = 'monthly'
      recurringForm.type = 'expense'
      recurringForm.isSubscription = true
    }
  }
}

function handleFormSubmit() {
  if (activeTab.value === 'subscriptions') {
    recurringForm.isSubscription = true
    recurringForm.type = 'expense'
  }
  addRecurringItem()
}

function startEditItem(item: any) {
  editRecurringItem(item)
  activeTab.value = item.isSubscription ? 'subscriptions' : 'recurring'
}

function handleCancelEdit() {
  resetRecurringForm(activeTab.value === 'subscriptions')
}

function frequencyLabel(value: string) {
  if (value === 'daily') return 'روزانه'
  if (value === 'weekly') return 'هفتگی'
  if (value === 'quarterly') return '۳ ماهه (فصلی)'
  if (value === 'biannual') return '۶ ماهه'
  if (value === 'yearly') return 'سالانه'
  return 'ماهانه'
}

function getSubscriptionDueBadge(item: any) {
  if (!item.isActive) return { text: 'غیرفعال', class: 'badge-inactive' }
  if (!item.nextDueDate) return { text: 'بدون سررسید', class: 'badge-inactive' }
  if (item.status === 'due' || item.daysUntilDue === 0) return { text: 'امروز موعد تمدید', class: 'badge-due' }
  if (item.status === 'overdue' || (item.daysUntilDue !== null && item.daysUntilDue < 0)) {
    return { text: `${Math.abs(item.daysUntilDue ?? 0)} روز تاخیر`, class: 'badge-overdue' }
  }
  if (item.daysUntilDue !== null && item.daysUntilDue <= (item.reminderDaysBefore || 3)) {
    return { text: `${item.daysUntilDue} روز تا تمدید`, class: 'badge-upcoming' }
  }
  return { text: `${item.daysUntilDue} روز تا تمدید`, class: 'badge-active' }
}
</script>

<template>
  <section class="glass-panel settings-card">
    <div class="section-title">
      <div>
        <h2>{{ activeTab === 'subscriptions' ? 'اشتراک‌های ماهانه و دوره‌ای' : 'پرداخت‌های دوره‌ای عمومی' }}</h2>
        <p>{{ activeTab === 'subscriptions' ? 'مدیریت و روزشمار سرویس‌های آنلاین، اشتراک‌های رسانه، نرم‌افزار و ابزارها' : 'درآمد ثابت، حقوق، اجاره خانه، قبوض و هزینه‌های منظم' }}</p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="subscriptions-tabs">
      <button
        type="button"
        :class="{ active: activeTab === 'subscriptions' }"
        @click="switchTab('subscriptions')"
      >
        <span>‏اشتراک‌ها</span>
        <em v-if="activeSubscriptionSummaries.length" class="tab-badge">{{ activeSubscriptionSummaries.length }}</em>
      </button>
      <button
        type="button"
        :class="{ active: activeTab === 'recurring' }"
        @click="switchTab('recurring')"
      >
        <span>‏پرداخت‌های عمومی</span>
        <em v-if="generalRecurringSummaries.length" class="tab-badge">{{ generalRecurringSummaries.length }}</em>
      </button>
    </div>

    <!-- Subscriptions Metric Grid -->
    <div v-if="activeTab === 'subscriptions'" class="report-grid">
      <span><small>مجموع هزینه ماهانه</small><strong>{{ formatMoney(monthlySubscriptionsTotal) }}</strong></span>
      <span><small>برآورد سالانه کل</small><strong>{{ formatMoney(annualSubscriptionsTotal) }}</strong></span>
      <span><small>اشتراک‌های فعال</small><strong>{{ activeSubscriptionSummaries.length }}</strong></span>
      <span><small>نزدیک سررسید</small><strong>{{ nearDueSubscriptions.length }}</strong></span>
    </div>

    <!-- General Recurring Metric Grid -->
    <div v-else class="report-grid">
      <span><small>درآمد تکراری ماه</small><strong>{{ formatMoney(monthlyRecurringIncomeTotal) }}</strong></span>
      <span><small>هزینه ثابت ماه</small><strong>{{ formatMoney(monthlyRecurringExpenseTotal) }}</strong></span>
      <span><small>پرداخت‌های فعال</small><strong>{{ generalRecurringSummaries.filter(i => i.isActive).length }}</strong></span>
      <span><small>نزدیک سررسید</small><strong>{{ generalNearItems.length }}</strong></span>
    </div>

    <!-- Subscriptions Form -->
    <form v-if="activeTab === 'subscriptions'" class="installment-form planning-form" @submit.prevent="handleFormSubmit">
      <div v-if="editingRecurringItemId" class="installment-edit-banner">
        <strong>ویرایش اشتراک: {{ recurringForm.title }}</strong>
        <button type="button" @click="handleCancelEdit">انصراف از ویرایش</button>
      </div>
      <label>
        <span>عنوان اشتراک</span>
        <input v-model="recurringForm.title" placeholder="مثلا فیلیمو، تلگرام پریمیوم، اسپاتیفای، VPN" required />
      </label>
      <label>
        <span>مبلغ اشتراک</span>
        <input :value="formatMoneyInput(recurringForm.amount)" inputmode="numeric" required @input="updateMoneyInput(recurringForm, 'amount', $event)" />
        <small v-if="recurringAmountInWords" class="amount-in-words">{{ recurringAmountInWords }}</small>
        <small v-if="monthlyEquivalentAmount && recurringForm.frequency !== 'monthly'" class="monthly-equivalent-badge">
          معادل {{ formatMoney(monthlyEquivalentAmount) }} در هر ماه
        </small>
      </label>
      <label>
        <span>دوره تمدید</span>
        <BudgetyarSelect v-model="recurringForm.frequency">
          <option value="monthly">ماهانه</option>
          <option value="quarterly">۳ ماهه (فصلی)</option>
          <option value="biannual">۶ ماهه</option>
          <option value="yearly">سالانه</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>دسته</span>
        <BudgetyarSelect v-model="recurringForm.categoryId">
          <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>تاریخ شروع / تمدید</span>
        <JalaliDatePicker v-model="recurringStartDatePickerValue" class="date-picker-field" :clearable="false" popover-class="date-picker-popover" />
      </label>
      <label>
        <span>روز سررسید ماه</span>
        <input v-model.number="recurringForm.dueDay" type="number" min="1" max="31" />
      </label>
      <label>
        <span>روش پرداخت</span>
        <BudgetyarSelect v-model="recurringForm.paymentMethod">
          <option value="cash">نقدی</option>
          <option value="credit">اعتباری</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>یادآوری چند روز قبل</span>
        <input v-model.number="recurringForm.reminderDaysBefore" type="number" min="0" max="30" />
      </label>
      <label class="check-row">
        <input v-model="recurringForm.isActive" type="checkbox" />
        <span>اشتراک فعال است</span>
      </label>
      <label class="installment-description">
        <span>توضیح یا اطلاعات پلن</span>
        <textarea v-model="recurringForm.note" rows="2" placeholder="اختیاری (مثلاً پلن خانواده، تاریخ انقضا و ...)" />
      </label>
      <button class="primary-button" type="submit">{{ editingRecurringItemId ? 'ذخیره اشتراک' : 'افزودن اشتراک' }}</button>
    </form>

    <!-- General Recurring Form -->
    <form v-else class="installment-form planning-form" @submit.prevent="handleFormSubmit">
      <div v-if="editingRecurringItemId" class="installment-edit-banner">
        <strong>ویرایش پرداخت تکراری</strong>
        <button type="button" @click="handleCancelEdit">انصراف از ویرایش</button>
      </div>
      <label>
        <span>عنوان</span>
        <input v-model="recurringForm.title" placeholder="مثلا اجاره خانه، حقوق، قبض برق" required />
      </label>
      <label>
        <span>نوع</span>
        <BudgetyarSelect v-model="recurringForm.type">
          <option value="expense">هزینه</option>
          <option value="income">درآمد</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>مبلغ</span>
        <input :value="formatMoneyInput(recurringForm.amount)" inputmode="numeric" required @input="updateMoneyInput(recurringForm, 'amount', $event)" />
        <small v-if="recurringAmountInWords" class="amount-in-words">{{ recurringAmountInWords }}</small>
      </label>
      <label>
        <span>دسته</span>
        <BudgetyarSelect v-model="recurringForm.categoryId" :disabled="recurringForm.type === 'income'">
          <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>تناوب</span>
        <BudgetyarSelect v-model="recurringForm.frequency">
          <option value="daily">روزانه</option>
          <option value="weekly">هفتگی</option>
          <option value="monthly">ماهانه</option>
          <option value="quarterly">۳ ماهه (فصلی)</option>
          <option value="biannual">۶ ماهه</option>
          <option value="yearly">سالانه</option>
        </BudgetyarSelect>
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
        <input v-model.number="recurringForm.dueDay" type="number" min="1" max="31" :disabled="recurringForm.frequency === 'daily' || recurringForm.frequency === 'weekly'" />
      </label>
      <label>
        <span>روش پرداخت</span>
        <BudgetyarSelect v-model="recurringForm.paymentMethod" :disabled="recurringForm.type === 'income'">
          <option value="cash">نقدی</option>
          <option value="credit">اعتباری</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>یادآوری چند روز قبل</span>
        <input v-model.number="recurringForm.reminderDaysBefore" type="number" min="0" max="30" />
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

    <!-- Near Due Subscriptions Action Section -->
    <section v-if="activeTab === 'subscriptions' && nearDueSubscriptions.length" class="weekly-category-budget glass-panel planning-inline">
      <div class="weekly-category-head">
        <strong>موعد تمدید نزدیک</strong>
        <small>با یک کلیک تمدید را در تراکنش‌ها ثبت کنید</small>
      </div>
      <div class="weekly-category-list">
        <span v-for="item in nearDueSubscriptions.slice(0, 5)" :key="item.id">
          <b>{{ item.title }}</b>
          <em>{{ item.nextDueDate }} · {{ formatMoney(item.amount) }} ({{ frequencyLabel(item.frequency) }})</em>
          <button class="primary-button" type="button" @click="markRecurringItemPaid(item)">تمدید و ثبت</button>
          <button class="soft-button" type="button" @click="skipRecurringOccurrence(item)">رد</button>
        </span>
      </div>
    </section>

    <!-- Near Due General Recurring Action Section -->
    <section v-else-if="activeTab === 'recurring' && generalNearItems.length" class="weekly-category-budget glass-panel planning-inline">
      <div class="weekly-category-head">
        <strong>نزدیک سررسید</strong>
        <small>ثبت پرداخت با تایید شما انجام می‌شود</small>
      </div>
      <div class="weekly-category-list">
        <span v-for="item in generalNearItems.slice(0, 5)" :key="item.id">
          <b>{{ item.title }}</b>
          <em>{{ item.nextDueDate }} · {{ formatMoney(item.amount) }}</em>
          <button class="primary-button" type="button" @click="markRecurringItemPaid(item)">ثبت</button>
          <button class="soft-button" type="button" @click="skipRecurringOccurrence(item)">رد</button>
        </span>
      </div>
    </section>

    <!-- Subscriptions List -->
    <div v-if="activeTab === 'subscriptions'">
      <div v-if="subscriptionSummaries.length" class="installments-grid planning-card-grid">
        <article v-for="item in subscriptionSummaries" :key="item.id" class="installment-item" :class="item.status">
          <div class="installment-item-head">
            <div>
              <strong>{{ item.title }}</strong>
              <small>{{ getCategory(item.categoryId).label }}</small>
            </div>
            <span :class="['subscription-countdown-pill', getSubscriptionDueBadge(item).class]">
              {{ getSubscriptionDueBadge(item).text }}
            </span>
          </div>
          <div class="installment-meta">
            <span>مبلغ دوره: {{ formatMoney(item.amount) }} <em class="sub-cycle-badge">{{ frequencyLabel(item.frequency) }}</em></span>
            <span v-if="item.frequency !== 'monthly'" class="sub-equivalent">سرانه ماهانه: {{ formatMoney(item.monthlyAmount) }}</span>
            <span>سررسید بعدی: {{ item.nextDueDate || 'ندارد' }}</span>
            <span>یادآوری: {{ item.reminderDaysBefore }} روز قبل</span>
          </div>
          <p v-if="item.note">{{ item.note }}</p>
          <div class="installment-actions">
            <button class="primary-button" type="button" @click="markRecurringItemPaid(item)">تمدید و ثبت هزینه</button>
            <button class="soft-button" type="button" @click="toggleRecurringItem(item.id)">{{ item.isActive ? 'غیرفعال' : 'فعال' }}</button>
            <button class="soft-button" type="button" @click="startEditItem(item)">ویرایش</button>
            <button class="soft-button" type="button" @click="deleteRecurringItem(item.id)">حذف</button>
          </div>
        </article>
      </div>
      <EmptyState v-else compact title="هنوز اشتراکی تعریف نشده است." text="سرویس‌هایی مثل فیلیمو، تلگرام پریمیوم، اسپاتیفای یا VPN را از فرم بالا اضافه کن." />
    </div>

    <!-- General Recurring List -->
    <div v-else>
      <div v-if="generalRecurringSummaries.length" class="installments-grid planning-card-grid">
        <article v-for="item in generalRecurringSummaries" :key="item.id" class="installment-item" :class="item.status">
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
            <span>{{ item.type === 'income' ? 'درآمد ثابت' : 'هزینه تکراری' }}</span>
          </div>
          <p v-if="item.note">{{ item.note }}</p>
          <div class="installment-actions">
            <button class="primary-button" type="button" @click="markRecurringItemPaid(item)">ثبت شد</button>
            <button class="soft-button" type="button" @click="toggleRecurringItem(item.id)">{{ item.isActive ? 'غیرفعال' : 'فعال' }}</button>
            <button class="soft-button" type="button" @click="startEditItem(item)">ویرایش</button>
            <button class="soft-button" type="button" @click="deleteRecurringItem(item.id)">حذف</button>
          </div>
        </article>
      </div>
      <EmptyState v-else compact title="هنوز پرداخت تکراری نداری." text="حقوق، اجاره خانه یا سایر هزینه‌های ثابت را از فرم بالا اضافه کن." />
    </div>
  </section>
</template>
