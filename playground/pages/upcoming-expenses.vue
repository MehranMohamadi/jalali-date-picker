<script setup lang="ts">
const {
  recurringSummaries,
  activeInstallmentSummaries,
  getCategory,
  formatMoney,
  toPersianNumber,
} = useBudgetyar()

const upcomingExpenses = computed(() => [
  ...recurringSummaries.value
    .filter((item) => item.isActive && item.type === 'expense' && item.nextDueDate)
    .map((item) => ({
      id: `recurring-${item.id}`,
      title: item.title,
      amount: item.amount,
      date: item.nextDueDate,
      icon: item.categoryId ? getCategory(item.categoryId).icon : '🔁',
      typeLabel: item.isSubscription ? 'اشتراک' : 'پرداخت دوره‌ای',
      status: item.status,
      statusLabel: item.statusLabel,
    })),
  ...activeInstallmentSummaries.value
    .filter((item) => item.nextDueDate)
    .map((item) => ({
      id: `installment-${item.id}`,
      title: item.title,
      amount: item.amount,
      date: item.nextDueDate,
      icon: '🧾',
      typeLabel: 'قسط',
      status: item.status,
      statusLabel: item.statusLabel,
    })),
].sort((a, b) => a.date.localeCompare(b.date)))

const totalUpcomingExpense = computed(() => upcomingExpenses.value.reduce((sum, item) => sum + item.amount, 0))
</script>

<template>
  <section class="glass-panel settings-card upcoming-expenses-page">
    <div class="section-title">
      <div>
        <h2>‏خرج‌های پیش‌رو</h2>
        <p>‏هزینه‌هایی که از قبل می‌دانی و باید برایشان آماده باشی.</p>
      </div>
    </div>

    <div class="report-grid upcoming-expense-summary">
      <span><small>‏مجموع پرداخت‌های بعدی</small><strong>{{ formatMoney(totalUpcomingExpense) }}</strong></span>
      <span><small>‏تعداد خرج‌های پیش‌رو</small><strong>{{ toPersianNumber(upcomingExpenses.length) }}</strong></span>
    </div>

    <div v-if="upcomingExpenses.length" class="upcoming-expense-list">
      <article v-for="item in upcomingExpenses" :key="item.id" class="upcoming-expense-item" :class="item.status">
        <span class="upcoming-expense-icon" aria-hidden="true">{{ item.icon }}</span>
        <div>
          <strong>{{ item.title }}</strong>
          <small>{{ item.typeLabel }} · {{ item.date }}</small>
        </div>
        <span class="upcoming-expense-status">{{ item.statusLabel }}</span>
        <b>{{ formatMoney(item.amount) }}</b>
      </article>
    </div>

    <EmptyState
      v-else
      title="‏خرج پیش‌رویی ثبت نشده است."
      text="‏هزینه‌های دوره‌ای یا اقساط را ثبت کن تا قبل از موعد اینجا ببینی."
    />
  </section>
</template>
