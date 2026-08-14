<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  widgets,
  dashboardCards,
  latestExpenses,
  upcomingInstallments,
  overdueInstallments,
  visibleCategoryTotals,
  hasExpenseData,
  expenseShareCanvas,
  getCategory,
  formatMoney,
  formatCompact,
  toPersianNumber,
  scheduleChartSync,
  destroyCharts,
} = budgetyar

const primaryWidgets = computed(() => widgets.value.slice(0, 4))
const primaryCards = computed(() => dashboardCards.value.slice(0, 2))
const visibleInstallments = computed(() => [...overdueInstallments.value, ...upcomingInstallments.value].slice(0, 3))

function cardValue(card: { value: number; suffix?: string }) {
  return card.suffix ? `${toPersianNumber(card.value)}${card.suffix}` : formatMoney(card.value)
}

onMounted(() => nextTick(scheduleChartSync))
onBeforeUnmount(destroyCharts)
</script>

<template>
  <section class="dashboard-hero glass-panel">
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

  <section class="dashboard-focus-grid">
    <article class="chart-card dashboard-spend-card glass-panel">
      <div class="section-title compact">
        <div>
          <h2>‏ترکیب هزینه‌ها</h2>
          <p>‏بیشترین سهم‌های خرج این ماه</p>
        </div>
      </div>

      <div class="pie-wrap compact">
        <div class="chart-canvas pie-chart" :class="{ empty: !hasExpenseData }">
          <canvas ref="expenseShareCanvas" aria-label="‏نمودار سهم هزینه‌ها" role="img" />
          <span v-if="!hasExpenseData">‏بدون داده</span>
        </div>
        <div class="legend compact">
          <span v-for="item in visibleCategoryTotals.slice(0, 5)" :key="item.key">
            <i :style="{ background: item.color }" />
            {{ item.icon }} {{ item.label }} · {{ formatCompact(item.spent) }}
          </span>
          <span v-if="!hasExpenseData">‏بعد از ثبت هزینه، سهم دسته‌ها اینجا دیده می‌شود.</span>
        </div>
      </div>

    </article>

    <div class="dashboard-side-stack">
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
    </div>
  </section>

</template>
