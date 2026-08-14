<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  widgets,
  dashboardCards,
  latestExpenses,
  upcomingInstallments,
  overdueInstallments,
  weeklyCategoryBudgets,
  getCategory,
  formatMoney,
  formatCompact,
  toPersianNumber,
} = budgetyar

const primaryWidgets = computed(() => widgets.value.slice(0, 4))
const primaryCards = computed(() => dashboardCards.value.slice(0, 4))
const highlightedBudgets = computed(() => weeklyCategoryBudgets.value.slice(0, 8))
const visibleInstallments = computed(() => [...overdueInstallments.value, ...upcomingInstallments.value].slice(0, 3))

function cardValue(card: { value: number; suffix?: string }) {
  return card.suffix ? `${toPersianNumber(card.value)}${card.suffix}` : formatMoney(card.value)
}

</script>

<template>
  <section class="dashboard-hero glass-panel">
    <div>
      <small>‏نمای امروز</small>
      <h1>‏پولدار</h1>
    </div>
    <div class="dashboard-quick-strip">
      <span v-for="widget in primaryWidgets" :key="widget.label">
        <i aria-hidden="true">{{ widget.icon }}</i>
        <b>{{ widget.value }}</b>
        <small>{{ widget.label }}</small>
      </span>
    </div>
  </section>

  <section class="dashboard-metrics">
    <MetricCard
      v-for="card in primaryCards"
      :key="card.label"
      :label="card.label"
      :value="cardValue(card)"
      :icon="card.icon"
      :hint="card.hint"
      :class-name="card.className"
    />
  </section>

  <section class="dashboard-side-stack">
      <section class="recent-expenses-card glass-panel">
        <div class="section-title compact">
          <div>
            <h2>‏آخرین خرج‌ها</h2>
          </div>
        </div>
        <div v-if="latestExpenses.length" class="recent-expenses-list">
          <div v-for="expense in latestExpenses.slice(0, 3)" :key="expense.id" class="recent-expense-row">
            <div>
              <strong>
                {{ expense.title }}
                <i v-if="expense.isEssential === false" class="nonessential-mark" title="غیرضروری" aria-label="غیرضروری">!</i>
              </strong>
              <span>{{ getCategory(expense.category).label }} · {{ expense.date }}</span>
            </div>
            <b>{{ formatCompact(expense.amount) }}</b>
          </div>
        </div>
        <p v-else class="empty-inline">‏هنوز خرجی ثبت نشده</p>
      </section>

      <section v-if="visibleInstallments.length" class="installment-alert-card glass-panel compact">
        <div class="weekly-category-head">
          <strong>‏قسط‌های نزدیک</strong>
          <small>{{ toPersianNumber(overdueInstallments.length) }} عقب‌افتاده</small>
        </div>
        <div class="installment-alert-list compact">
          <span v-for="item in visibleInstallments" :key="item.id">
            <b>{{ item.title }}</b>
            <em>{{ item.nextDueDate }} · {{ formatCompact(item.amount) }}</em>
          </span>
        </div>
      </section>
  </section>

  <section class="weekly-category-budget glass-panel compact">
    <div class="weekly-category-head">
      <strong>‏بودجه هفتگی بخش‌ها</strong>
      <small>‏نمای کوتاه</small>
    </div>
    <div class="weekly-category-list compact">
      <span v-for="item in highlightedBudgets" :key="item.key">
        <b>{{ item.icon }} {{ item.label }}</b>
        <em>{{ formatCompact(item.weeklyBudget) }}</em>
      </span>
    </div>
  </section>
</template>
