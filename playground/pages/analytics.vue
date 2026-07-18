<script setup lang="ts">
import { Download, FileSpreadsheet, Printer } from 'lucide-vue-next'

const budgetyar = useBudgetyar()
const {
  weeklyBudgetAnalysis,
  summaryLines,
  insights,
  statsItems,
  latestLoans,
  hasExpenseData,
  hasMonthlyTrendData,
  statsExpenseMixCanvas,
  statsBudgetUsageCanvas,
  statsCashFlowCanvas,
  statsMonthlyTrendCanvas,
  cashFlowMode,
  totalExpense,
  totalBudget,
  commitmentTotal,
  flexibleAfterCommitments,
  balanceAfterCommitments,
  budgetAnalysisItems,
  formatCompact,
  formatMoney,
  toPersianNumber,
  exportReport,
  scheduleChartSync,
  destroyCharts,
} = budgetyar

const visibleStats = computed(() => statsItems.value.filter((item) => !item.label.includes('بودجه') || totalBudget.value > 0))
const primaryStats = computed(() => visibleStats.value.slice(0, 8))
const secondaryStats = computed(() => visibleStats.value.slice(8))

onMounted(() => nextTick(scheduleChartSync))
onBeforeUnmount(destroyCharts)
</script>

<template>
  <section class="dashboard-grid page-grid">
    <article class="glass-panel summary-card analytics-summary-card" data-section="تحلیل‌ها">
      <div class="section-title">
        <div>
          <h2>تحلیل مالی</h2>
          <p>چند عدد مهم برای تصمیم‌گیری سریع</p>
        </div>
        <div class="export-actions analytics-export-actions">
          <button type="button" @click="exportReport('PDF')">
            <Printer :size="16" aria-hidden="true" />
            <span>چاپی</span>
          </button>
          <button type="button" @click="exportReport('Excel')">
            <FileSpreadsheet :size="16" aria-hidden="true" />
            <span>Excel</span>
          </button>
          <button type="button" @click="exportReport('CSV')">
            <Download :size="16" aria-hidden="true" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div class="analytics-snapshot-grid">
        <span>
          <small>هزینه ماه</small>
          <b>{{ formatMoney(totalExpense) }}</b>
        </span>
        <span>
          <small>مانده واقعی</small>
          <b>{{ formatMoney(balanceAfterCommitments) }}</b>
        </span>
        <span>
          <small>تعهدات ماه</small>
          <b>{{ formatMoney(commitmentTotal) }}</b>
        </span>
        <span>
          <small>پول آزاد</small>
          <b>{{ formatMoney(flexibleAfterCommitments) }}</b>
        </span>
      </div>

      <div class="analytics-decision-grid">
        <div class="insights analytics-insights">
          <strong>برداشت سریع</strong>
          <span v-for="insight in insights.slice(0, 3)" :key="insight">{{ insight }}</span>
        </div>

        <div class="weekly-overanalysis analytics-alerts">
          <strong>هشدار بودجه هفته</strong>
          <div v-if="weeklyBudgetAnalysis.length" class="weekly-overanalysis-list">
            <span v-for="item in weeklyBudgetAnalysis" :key="item.key">
              <b>{{ item.icon }} {{ item.label }}</b>
              <em>{{ formatCompact(item.spentThisWeek) }} / {{ formatCompact(item.weeklyBudget) }}</em>
              <small>{{ item.overAmount ? `${formatCompact(item.overAmount)} بیشتر از بودجه هفتگی` : `${toPersianNumber(item.ratio)}٪ بودجه هفتگی مصرف شده` }}</small>
            </span>
          </div>
          <p v-else>این هفته هنوز دسته‌ای به محدوده خطر نرسیده.</p>
        </div>
      </div>

      <div class="analysis-note-grid compact">
        <p v-for="line in summaryLines" :key="line">{{ line }}</p>
      </div>
    </article>

    <article class="glass-panel stats-card analytics-main-card" data-section="آمار">
      <div class="section-title">
        <div>
          <h2>نمودارهای اصلی</h2>
          <p>فقط چیزهایی که واقعاً مسیر خرج و بودجه را نشان می‌دهند</p>
        </div>
      </div>

      <div class="stats-grid analytics-stats-grid">
        <div v-for="item in primaryStats" :key="item.label">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div class="stats-analysis-grid analytics-chart-grid simplified">
        <section class="stats-chart-panel wide analytics-priority-chart">
          <div class="section-title compact">
            <div>
              <h2>روند شش‌ماهه</h2>
              <p>درآمد، هزینه و مانده در چند ماه اخیر</p>
            </div>
          </div>
          <div class="chart-canvas stats-line-chart" :class="{ empty: !hasMonthlyTrendData }">
            <canvas ref="statsMonthlyTrendCanvas" aria-label="نمودار روند شش‌ماهه" role="img" />
            <span v-if="!hasMonthlyTrendData">بدون داده</span>
          </div>
        </section>

        <section v-if="budgetAnalysisItems.length" class="stats-chart-panel wide">
          <div class="section-title compact">
            <div>
              <h2>مصرف بودجه</h2>
              <p>دسته‌هایی که بودجه را خورده‌اند یا از سقف رد شده‌اند</p>
            </div>
          </div>
          <div class="chart-canvas stats-budget-chart">
            <canvas ref="statsBudgetUsageCanvas" aria-label="نمودار مصرف بودجه دسته‌ها" role="img" />
          </div>
        </section>

        <section class="stats-chart-panel">
          <div class="section-title compact">
            <div>
              <h2>ترکیب هزینه‌ها</h2>
              <p>سهم دسته‌های پرمصرف</p>
            </div>
          </div>
          <div class="chart-canvas stats-polar-chart" :class="{ empty: !hasExpenseData }">
            <canvas ref="statsExpenseMixCanvas" aria-label="نمودار ترکیب هزینه‌ها" role="img" />
            <span v-if="!hasExpenseData">بدون داده</span>
          </div>
        </section>

        <section class="stats-chart-panel">
          <div class="section-title compact">
            <div>
              <h2>جریان پول</h2>
              <p>{{ cashFlowMode === 'afterCommitments' ? 'بعد از اعتبار و تعهدات' : cashFlowMode === 'afterCredit' ? 'بعد از بدهی اعتبار' : 'درآمد، هزینه و پس‌انداز' }}</p>
            </div>
          </div>
          <div class="chart-toggle segmented compact-toggle">
            <button type="button" :class="{ active: cashFlowMode === 'regular' }" @click="cashFlowMode = 'regular'">معمولی</button>
            <button type="button" :class="{ active: cashFlowMode === 'afterCredit' }" @click="cashFlowMode = 'afterCredit'">بعد اعتبار</button>
            <button type="button" :class="{ active: cashFlowMode === 'afterCommitments' }" @click="cashFlowMode = 'afterCommitments'">بعد تعهدات</button>
          </div>
          <div class="chart-canvas stats-cash-chart">
            <canvas ref="statsCashFlowCanvas" aria-label="نمودار جریان پول" role="img" />
          </div>
        </section>
      </div>

      <details v-if="secondaryStats.length || latestLoans.length" class="analytics-details">
        <summary>جزئیات بیشتر</summary>
        <div class="stats-grid analytics-stats-grid compact">
          <div v-for="item in secondaryStats" :key="item.label">
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
      </details>
    </article>
  </section>
</template>
