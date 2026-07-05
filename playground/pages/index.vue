<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  widgets,
  dashboardCards,
  latestExpenses,
  upcomingInstallments,
  overdueInstallments,
  weeklyCategoryBudgets,
  visibleCategoryTotals,
  hasExpenseData,
  expenseShareCanvas,
  categoryBarCanvas,
  trendLineCanvas,
  getCategory,
  formatMoney,
  formatCompact,
  toPersianNumber,
  syncCharts,
  destroyCharts,
} = budgetyar

function cardValue(card: { value: number; suffix?: string }) {
  return card.suffix ? `${toPersianNumber(card.value)}${card.suffix}` : formatMoney(card.value)
}

onMounted(() => nextTick(syncCharts))
onBeforeUnmount(destroyCharts)
</script>

<template>
  <section class="widgets-grid">
    <article v-for="widget in widgets" :key="widget.label" class="mini-card glass-panel">
      <small>{{ widget.label }}</small>
      <strong>{{ widget.value }}</strong>
    </article>
  </section>

  <section class="cards-grid">
    <MetricCard
      v-for="card in dashboardCards"
      :key="card.label"
      :label="card.label"
      :value="cardValue(card)"
      :class-name="card.className"
    />
  </section>

  <section class="recent-expenses-card glass-panel">
    <div class="section-title compact">
      <div>
        <h2>سه خرج آخر</h2>
      </div>
    </div>
    <div v-if="latestExpenses.length" class="recent-expenses-list">
      <div v-for="expense in latestExpenses" :key="expense.id" class="recent-expense-row">
        <div>
          <strong>
            {{ expense.title }}
            <i v-if="expense.isEssential === false" class="nonessential-mark" title="غیرضروری" aria-label="غیرضروری">⚠️</i>
          </strong>
          <span>{{ getCategory(expense.category).label }} · {{ expense.date }}</span>
        </div>
        <b>{{ formatCompact(expense.amount) }}</b>
      </div>
    </div>
    <p v-else class="empty-inline">هنوز خرجی ثبت نشده</p>
  </section>

  <section v-if="upcomingInstallments.length || overdueInstallments.length" class="installment-alert-card glass-panel">
    <div class="weekly-category-head">
      <strong>قسط‌های نزدیک</strong>
      <small>{{ toPersianNumber(overdueInstallments.length) }} عقب‌افتاده</small>
    </div>
    <div class="installment-alert-list">
      <span v-for="item in [...overdueInstallments, ...upcomingInstallments].slice(0, 4)" :key="item.id">
        <b>{{ item.title }}</b>
        <em>{{ item.nextDueDate }} · {{ formatCompact(item.amount) }}</em>
      </span>
    </div>
  </section>

  <section class="dashboard-grid">
    <article class="chart-card glass-panel">
      <div class="section-title">
        <div>
          <h2>سهم دسته‌های هزینه</h2>
          <p>نمایش سهم هر دسته از هزینه‌ها</p>
        </div>
      </div>
      <div class="pie-wrap">
        <div class="chart-canvas pie-chart" :class="{ empty: !hasExpenseData }">
          <canvas ref="expenseShareCanvas" aria-label="نمودار دایره‌ای هزینه‌ها" role="img" />
          <span v-if="!hasExpenseData">بدون داده</span>
        </div>
        <div class="legend">
          <span v-for="item in visibleCategoryTotals.slice(0, 7)" :key="item.key">
            <i :style="{ background: item.color }" />
            {{ item.icon }} {{ item.label }} · {{ formatCompact(item.spent) }}
          </span>
          <span v-if="!hasExpenseData">بعد از ثبت هزینه، سهم دسته‌ها نمایش داده می‌شود.</span>
        </div>
      </div>
    </article>

    <article class="chart-card glass-panel">
      <div class="section-title">
        <div>
          <h2>مقایسه هزینه دسته‌ها</h2>
          <p>نمودار ستونی بودجه مصرف‌شده</p>
        </div>
      </div>
      <div class="chart-canvas bar-chart">
        <canvas ref="categoryBarCanvas" aria-label="نمودار ستونی دسته‌های هزینه" role="img" />
      </div>
    </article>

    <article class="chart-card glass-panel wide">
      <div class="section-title">
        <div>
          <h2>روند خرج کردن و باقی مانده بودجه</h2>
          <p>نمودار خطی و ناحیه‌ای در طول ماه</p>
        </div>
      </div>
      <div class="chart-canvas line-chart">
        <canvas ref="trendLineCanvas" aria-label="نمودار روند ماهانه" role="img" />
      </div>
    </article>
  </section>

  <section class="weekly-category-budget glass-panel">
    <div class="weekly-category-head">
      <strong>بودجه هفتگی بخش‌ها</strong>
      <small>برای هر هفته</small>
    </div>
    <div class="weekly-category-list">
      <span v-for="item in weeklyCategoryBudgets" :key="item.key">
        <b>{{ item.icon }} {{ item.label }}</b>
        <em>{{ formatCompact(item.weeklyBudget) }}</em>
      </span>
    </div>
  </section>
</template>
