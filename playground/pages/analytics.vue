<script setup lang="ts">
const { amountsHidden, privateText } = usePrivacy()
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
  statsDailyExpenseCanvas,
  statsCashFlowCanvas,
  statsMonthlyTrendCanvas,
  monthlyTrendPoints,
  dailyExpensePoints,
  cashFlowMode,
  totalExpense,
  totalBudget,
  commitmentTotal,
  flexibleAfterCommitments,
  balanceAfterCommitments,
  balanceAfterCreditPayment,
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
const monthlyExpenseBars = computed(() => monthlyTrendPoints.value.map((point) => ({ label: point.label, value: point.expense })))
const dailyExpenseBars = computed(() => dailyExpensePoints.value.map((point) => ({ label: point.label, value: point.expense })))
const fullDetailsOpen = ref(false)
const cashFlowBalance = computed(() => cashFlowMode.value === 'afterCommitments'
  ? balanceAfterCommitments.value
  : cashFlowMode.value === 'afterCredit' ? balanceAfterCreditPayment.value : Math.max(0, balanceAfterCreditPayment.value))
const cashFlowLabel = computed(() => cashFlowMode.value === 'afterCommitments' ? '‏مانده بعد تعهدات' : cashFlowMode.value === 'afterCredit' ? '‏مانده بعد اعتبار' : '‏پس‌انداز')

function formatAnalyticsMetric(value: number) {
  return formatCompact(value).replace(' میلیون تومان', ' م').replace(' هزار تومان', ' ه').replace(' تومان', '')
}
function categoryBudgetUsage(spent: number, budget: number) {
  return budget > 0 ? Math.max(0, Math.round(spent / budget * 100)) : 0
}
function toggleFullDetails(event: Event) {
  fullDetailsOpen.value = (event.target as HTMLDetailsElement).open
  if (fullDetailsOpen.value) nextTick(scheduleChartSync)
  else destroyCharts()
}

onMounted(() => nextTick(scheduleChartSync))
onBeforeUnmount(destroyCharts)
</script>

<template>
  <section class="analytics-page" aria-label="‏تحلیل‌های مالی">
    <div class="analytics-exports" role="group" aria-label="‏خروجی گزارش">
      <button class="active" type="button" @click="exportReport('PDF')">‏چاپی</button>
      <button type="button" @click="exportReport('Excel')">Excel</button>
      <button type="button" @click="exportReport('CSV')">CSV</button>
    </div>
    <div class="analytics-metrics">
      <div><small>‏هزینه ماه</small><strong>{{ formatAnalyticsMetric(totalExpense) }}</strong></div>
      <div><small>‏مانده</small><strong>{{ formatAnalyticsMetric(balanceAfterCommitments) }}</strong></div>
      <div><small>‏تعهدات</small><strong>{{ formatAnalyticsMetric(commitmentTotal) }}</strong></div>
      <div><small>‏پول آزاد</small><strong>{{ formatAnalyticsMetric(flexibleAfterCommitments) }}</strong></div>
    </div>

    <section class="glass-panel analytics-panel analytics-weekly-warning">
      <h2>‏هشدار بودجه هفته</h2>
      <div v-if="weeklyBudgetAnalysis.length" class="analytics-warning-list">
        <p v-for="item in weeklyBudgetAnalysis.slice(0, 3)" :key="item.key">{{ privateText(`${item.label} · ${toPersianNumber(item.ratio)}٪ بودجه هفتگی مصرف شده`) }}</p>
        <small v-if="weeklyBudgetAnalysis.length > 3">‏موارد دیگر در جزئیات بیشتر نمایش داده می‌شوند.</small>
      </div>
      <p v-else class="analytics-empty">‏این هفته دسته‌ای به محدودهٔ خطر نرسیده است.</p>
      <small class="analytics-week-note">‏هفته از شنبه تا جمعه محاسبه می‌شود.</small>
    </section>

    <div class="analytics-compact-charts">
      <section class="glass-panel analytics-panel analytics-monthly-trend">
        <h2>‏روند شش‌ماهه</h2>
        <AnalyticsBarChart :points="monthlyExpenseBars" label="‏هزینه هر ماه در شش ماه اخیر" />
      </section>
      <section class="glass-panel analytics-panel analytics-daily-expense">
        <h2>‏خرج روزانه</h2>
        <AnalyticsBarChart :points="dailyExpenseBars" label="‏هزینه هر روز ماه جاری" />
      </section>
    </div>

    <section class="glass-panel analytics-panel analytics-budget-mix">
      <h2>‏مصرف بودجه و ترکیب هزینه‌ها</h2>
      <div v-if="budgetAnalysisItems.length" class="analytics-budget-list">
        <article v-for="item in budgetAnalysisItems.slice(0, 2)" :key="item.key" class="analytics-budget-row" :class="{ watch: item.spent >= item.budget * .9, exceeded: item.spent > item.budget }">
          <h3>{{ item.label }}</h3>
          <p>{{ privateText(`${toPersianNumber(totalExpense > 0 ? Math.round(item.spent / totalExpense * 100) : 0)}٪ هزینه · ${toPersianNumber(categoryBudgetUsage(item.spent, item.budget))}٪ بودجه`) }}</p>
          <div class="analytics-budget-progress" role="progressbar" :aria-label="item.label" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="amountsHidden ? undefined : Math.min(100, categoryBudgetUsage(item.spent, item.budget))" :aria-valuetext="amountsHidden ? '‏پنهان' : `${toPersianNumber(categoryBudgetUsage(item.spent, item.budget))}٪`">
            <i :style="{ width: `${amountsHidden ? 0 : Math.min(100, categoryBudgetUsage(item.spent, item.budget))}%` }" />
          </div>
        </article>
      </div>
      <p v-else class="analytics-empty">‏هنوز سقف بودجه‌ای تعریف نشده است.</p>
    </section>

    <section class="glass-panel analytics-panel analytics-cash-flow">
      <h2>‏جریان پول</h2>
      <div class="analytics-flow-tabs" role="group" aria-label="‏روش محاسبه جریان پول">
        <button type="button" :class="{ active: cashFlowMode === 'regular' }" :aria-pressed="cashFlowMode === 'regular'" @click="cashFlowMode = 'regular'">‏معمولی</button>
        <button type="button" :class="{ active: cashFlowMode === 'afterCredit' }" :aria-pressed="cashFlowMode === 'afterCredit'" @click="cashFlowMode = 'afterCredit'">‏بعد اعتبار</button>
        <button type="button" :class="{ active: cashFlowMode === 'afterCommitments' }" :aria-pressed="cashFlowMode === 'afterCommitments'" @click="cashFlowMode = 'afterCommitments'">‏بعد تعهدات</button>
      </div>
      <p class="analytics-flow-balance" aria-live="polite">{{ cashFlowLabel }}: {{ formatMoney(cashFlowBalance) }}</p>
      <details class="analytics-full-details" @toggle="toggleFullDetails">
        <summary class="soft-button">‏جزئیات بیشتر</summary>
  <section v-if="fullDetailsOpen" class="dashboard-grid page-grid analytics-expanded">
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
          <span v-for="insight in insights.slice(0, 3)" :key="insight">{{ privateText(insight) }}</span>
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
          <strong>{{ privateText(item.value) }}</strong>
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
          <div class="chart-canvas chart-scrollable stats-line-chart" :class="{ empty: !hasMonthlyTrendData }">
            <div class="chart-scroll-content">
              <canvas v-show="!amountsHidden" :aria-hidden="amountsHidden" ref="statsMonthlyTrendCanvas" aria-label="نمودار روند شش‌ماهه" role="img" />
            </div>
            <span v-if="!hasMonthlyTrendData">بدون داده</span>
          </div>
        </section>

        <section class="stats-chart-panel wide">
          <div class="section-title compact">
            <div>
              <h2>‏خرج روزانه</h2>
              <p>‏هزینه هر روز ماه جاری در مقایسه با میانگین روزانه</p>
            </div>
          </div>
          <div class="chart-canvas chart-scrollable stats-line-chart" :class="{ empty: !hasExpenseData }">
            <div class="chart-scroll-content">
              <canvas v-show="!amountsHidden" :aria-hidden="amountsHidden" ref="statsDailyExpenseCanvas" aria-label="‏نمودار خرج روزانه ماه جاری" role="img" />
            </div>
            <span v-if="!hasExpenseData">‏بدون داده</span>
          </div>
        </section>

        <section v-if="budgetAnalysisItems.length" class="stats-chart-panel wide">
          <div class="section-title compact">
            <div>
              <h2>مصرف بودجه</h2>
              <p>دسته‌هایی که بودجه را خورده‌اند یا از سقف رد شده‌اند</p>
            </div>
          </div>
          <div class="chart-canvas chart-scrollable stats-budget-chart">
            <div class="chart-scroll-content">
              <canvas v-show="!amountsHidden" :aria-hidden="amountsHidden" ref="statsBudgetUsageCanvas" aria-label="نمودار مصرف بودجه دسته‌ها" role="img" />
            </div>
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
            <canvas v-show="!amountsHidden" :aria-hidden="amountsHidden" ref="statsExpenseMixCanvas" aria-label="نمودار ترکیب هزینه‌ها" role="img" />
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
          <div class="chart-canvas chart-scrollable stats-cash-chart">
            <div class="chart-scroll-content">
              <canvas v-show="!amountsHidden" :aria-hidden="amountsHidden" ref="statsCashFlowCanvas" aria-label="نمودار جریان پول" role="img" />
            </div>
          </div>
        </section>
      </div>

      <details v-if="secondaryStats.length || latestLoans.length" class="analytics-details">
        <summary>جزئیات بیشتر</summary>
        <div class="stats-grid analytics-stats-grid compact">
          <div v-for="item in secondaryStats" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ privateText(item.value) }}</strong>
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
      </details>
    </section>
  </section>
</template>

<style scoped>
.analytics-page { display: grid; gap: 12px; min-width: 0; }
.analytics-exports, .analytics-flow-tabs { display: grid; gap: 6px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.analytics-exports button, .analytics-flow-tabs button { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 16px; color: var(--text); font-size: .75rem; min-height: 38px; padding: 7px; }
.analytics-exports button.active, .analytics-flow-tabs button.active { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.analytics-metrics { display: grid; gap: 8px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.analytics-metrics > div { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; display: grid; gap: 10px; min-width: 0; padding: 12px; }
.analytics-metrics small { color: var(--muted); font-size: .6875rem; }
.analytics-metrics strong { color: var(--text); font-size: 1.05rem; font-weight: 600; overflow-wrap: anywhere; }
.analytics-page .analytics-panel { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; min-width: 0; padding: 14px; }
.analytics-panel > h2 { color: var(--text); font-size: .9rem; font-weight: 600; margin: 0 0 14px; }
.analytics-warning-list { display: grid; gap: 8px; }
.analytics-warning-list p { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 15px; color: var(--warning); font-size: .6875rem; line-height: 1.8; margin: 0; padding: 10px 12px; }
.analytics-warning-list > small, .analytics-week-note { color: var(--muted); display: block; font-size: .625rem; line-height: 1.8; }
.analytics-week-note { margin-top: 10px; }
.analytics-compact-charts { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.analytics-budget-list { display: grid; gap: 16px; }
.analytics-budget-row h3 { color: var(--text); font-size: .8125rem; font-weight: 400; margin: 0 0 8px; }
.analytics-budget-row > p { color: var(--muted); font-size: .6875rem; margin: 0 0 12px; }
.analytics-budget-progress { background: var(--panel-soft); border-radius: 999px; height: 5px; overflow: hidden; }
.analytics-budget-progress i { background: var(--primary); border-radius: inherit; display: block; height: 100%; margin-inline-end: auto; }
.analytics-budget-row.watch .analytics-budget-progress i { background: var(--warning); }
.analytics-budget-row.exceeded .analytics-budget-progress i { background: var(--danger); }
.analytics-page .analytics-empty { color: var(--muted); font-size: .75rem; line-height: 1.8; margin: 0; }
.analytics-flow-balance { color: var(--primary); font-size: .75rem; line-height: 1.8; margin: 12px 0; overflow-wrap: anywhere; }
.analytics-full-details > summary { color: var(--text); cursor: pointer; display: flex; justify-content: center; list-style: none; min-height: 42px; text-align: center; width: 100%; }
.analytics-full-details > summary::-webkit-details-marker { display: none; }
.analytics-expanded { margin-top: 12px; min-width: 0; }
.analytics-expanded .analytics-summary-card, .analytics-expanded .analytics-main-card { min-width: 0; }
@media (max-width: 760px) {
  .analytics-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .analytics-metrics > div { padding: 10px 12px; }
  .analytics-compact-charts { grid-template-columns: minmax(0, 1fr); }
  .analytics-page .analytics-panel { padding: 12px; }
}
</style>
