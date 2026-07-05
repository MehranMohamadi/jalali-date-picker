<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  weeklyBudgetAnalysis,
  summaryLines,
  insights,
  statsItems,
  latestLoans,
  hasExpenseData,
  statsExpenseMixCanvas,
  statsBudgetUsageCanvas,
  statsDailyExpenseCanvas,
  statsWeeklyFlowCanvas,
  statsCashFlowCanvas,
  cashFlowMode,
  totalExpense,
  creditExpense,
  monthlyInstallmentDue,
  balanceAfterCommitments,
  essentialExpense,
  nonEssentialExpense,
  safeMaxCategory,
  balance,
  formatCompact,
  formatMoney,
  toPersianNumber,
  exportReport,
  syncCharts,
  destroyCharts,
} = budgetyar

onMounted(() => nextTick(syncCharts))
onBeforeUnmount(destroyCharts)
</script>

<template>
  <section class="dashboard-grid page-grid">
    <article class="glass-panel summary-card" data-section="تحلیل‌ها">
      <div class="section-title">
        <div>
          <h2>خلاصه مالی</h2>
          <p>گزارش ماهانه و هشدارهای مهم</p>
        </div>
        <div class="export-actions">
          <button type="button" @click="exportReport('PDF')">چاپی</button>
          <button type="button" @click="exportReport('Excel')">Excel</button>
          <button type="button" @click="exportReport('CSV')">CSV</button>
        </div>
      </div>

      <div class="weekly-overanalysis">
        <strong>خرج‌های مشکوک این هفته</strong>
        <div v-if="weeklyBudgetAnalysis.length" class="weekly-overanalysis-list">
          <span v-for="item in weeklyBudgetAnalysis" :key="item.key">
            <b>{{ item.icon }} {{ item.label }}</b>
            <em>{{ formatCompact(item.spentThisWeek) }} / {{ formatCompact(item.weeklyBudget) }}</em>
            <small>{{ item.overAmount ? `${formatCompact(item.overAmount)} بیشتر از بودجه هفتگی` : `${toPersianNumber(item.ratio)}٪ بودجه هفتگی مصرف شده` }}</small>
          </span>
        </div>
        <p v-else>این هفته هنوز هیچ دسته‌ای به محدوده خطر بودجه هفتگی نرسیده.</p>
      </div>

      <p v-for="line in summaryLines" :key="line">{{ line }}</p>
      <div class="insights">
        <strong>بینش‌های هوشمند</strong>
        <span v-for="insight in insights" :key="insight">{{ insight }}</span>
      </div>

      <div class="report-grid">
        <span>گزارش ماهانه · {{ formatMoney(totalExpense) }}</span>
        <span>پرداخت اعتبار · {{ formatMoney(creditExpense) }}</span>
        <span>قسط‌های این ماه · {{ formatMoney(monthlyInstallmentDue) }}</span>
        <span>مانده تعهدات · {{ formatMoney(balanceAfterCommitments) }}</span>
        <span>خرج ضروری · {{ formatMoney(essentialExpense) }}</span>
        <span>خرج غیرضروری · {{ formatMoney(nonEssentialExpense) }}</span>
        <span>دسته پرخرج · {{ safeMaxCategory.label }}</span>
        <span>پس‌انداز · {{ formatMoney(balance) }}</span>
      </div>
    </article>

    <article class="glass-panel stats-card" data-section="آمار">
      <div class="section-title">
        <div>
          <h2>آمار</h2>
          <p>شاخص‌های کلیدی و نمودارها</p>
        </div>
      </div>
      <div class="stats-grid">
        <div v-for="item in statsItems" :key="item.label">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
      <div v-if="latestLoans.length" class="loan-summary-list">
        <strong>قرض‌های این ماه</strong>
        <span v-for="item in latestLoans" :key="item.id">
          <b>{{ item.loanPerson }}</b>
          <em>{{ item.title }} · {{ formatMoney(item.amount) }}</em>
        </span>
      </div>
      <div class="stats-analysis-grid">
        <section class="stats-chart-panel">
          <div class="section-title compact">
            <div>
              <h2>ترکیب هزینه‌ها</h2>
              <p>سهم نسبی دسته‌های پرمصرف</p>
            </div>
          </div>
          <div class="chart-canvas stats-polar-chart" :class="{ empty: !hasExpenseData }">
            <canvas ref="statsExpenseMixCanvas" aria-label="نمودار ترکیب هزینه‌ها" role="img" />
            <span v-if="!hasExpenseData">بدون داده</span>
          </div>
        </section>

        <section class="stats-chart-panel wide">
          <div class="section-title compact">
            <div>
              <h2>مصرف بودجه دسته‌ها</h2>
              <p>مصرف‌شده، مانده و عبور از سقف</p>
            </div>
          </div>
          <div class="chart-canvas stats-budget-chart">
            <canvas ref="statsBudgetUsageCanvas" aria-label="نمودار مصرف بودجه دسته‌ها" role="img" />
          </div>
        </section>

        <section class="stats-chart-panel wide">
          <div class="section-title compact">
            <div>
              <h2>خرج روزانه</h2>
              <p>نوسان هزینه در روزهای ماه</p>
            </div>
          </div>
          <div class="chart-canvas stats-line-chart">
            <canvas ref="statsDailyExpenseCanvas" aria-label="نمودار خرج روزانه" role="img" />
          </div>
        </section>

        <section class="stats-chart-panel wide">
          <div class="section-title compact">
            <div>
              <h2>آمار هفتگی</h2>
              <p>درآمد و هزینه روزهای هفته جاری</p>
            </div>
          </div>
          <div class="chart-canvas stats-weekly-chart">
            <canvas ref="statsWeeklyFlowCanvas" aria-label="نمودار آمار هفتگی" role="img" />
          </div>
        </section>

        <section class="stats-chart-panel">
          <div class="section-title compact">
            <div>
              <h2>جریان پول</h2>
              <p>{{ cashFlowMode === 'afterCommitments' ? 'پول کل منهای اعتبار و قسط' : cashFlowMode === 'afterCredit' ? 'پول کل منهای بدهی اعتبار' : 'درآمد، هزینه و پس‌انداز' }}</p>
            </div>
          </div>
          <div class="chart-toggle segmented compact-toggle">
            <button type="button" :class="{ active: cashFlowMode === 'regular' }" @click="cashFlowMode = 'regular'">معمولی</button>
            <button type="button" :class="{ active: cashFlowMode === 'afterCredit' }" @click="cashFlowMode = 'afterCredit'">بعد از اعتبار</button>
            <button type="button" :class="{ active: cashFlowMode === 'afterCommitments' }" @click="cashFlowMode = 'afterCommitments'">بعد از تعهدات</button>
          </div>
          <div class="chart-canvas stats-cash-chart">
            <canvas ref="statsCashFlowCanvas" aria-label="نمودار جریان پول" role="img" />
          </div>
        </section>
      </div>
    </article>
  </section>
</template>
