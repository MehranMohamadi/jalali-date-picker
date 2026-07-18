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
  statsDailyExpenseCanvas,
  statsWeeklyFlowCanvas,
  statsCashFlowCanvas,
  statsEssentialCanvas,
  statsPaymentMethodCanvas,
  statsMonthlyTrendCanvas,
  statsCommitmentCanvas,
  cashFlowMode,
  totalExpense,
  creditExpense,
  monthlyInstallmentDue,
  monthlyRecurringExpenseTotal,
  commitmentTotal,
  flexibleAfterCommitments,
  balanceAfterCommitments,
  essentialExpense,
  nonEssentialExpense,
  safeMaxCategory,
  balance,
  formatCompact,
  formatMoney,
  toPersianNumber,
  exportReport,
  scheduleChartSync,
  destroyCharts,
} = budgetyar

const hasCommitmentData = computed(() => commitmentTotal.value > 0 || flexibleAfterCommitments.value > 0)

onMounted(() => nextTick(scheduleChartSync))
onBeforeUnmount(destroyCharts)
</script>

<template>
  <section class="dashboard-grid page-grid">
    <article class="glass-panel summary-card analytics-summary-card" data-section="تحلیل‌ها">
      <div class="section-title">
        <div>
          <h2>خلاصه مالی</h2>
          <p>گزارش ماهانه، هشدارها و مسیر پول</p>
        </div>
        <div class="export-actions">
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
          <small>مانده بعد تعهدات</small>
          <b>{{ formatMoney(balanceAfterCommitments) }}</b>
        </span>
        <span>
          <small>تعهدات ماه</small>
          <b>{{ formatMoney(commitmentTotal) }}</b>
        </span>
        <span>
          <small>دسته پرخرج</small>
          <b>{{ safeMaxCategory.icon }} {{ safeMaxCategory.label }}</b>
        </span>
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

      <div class="analysis-note-grid">
        <p v-for="line in summaryLines" :key="line">{{ line }}</p>
      </div>

      <div class="insights">
        <strong>بینش‌های هوشمند</strong>
        <span v-for="insight in insights" :key="insight">{{ insight }}</span>
      </div>

      <div class="report-grid">
        <span>گزارش ماهانه · {{ formatMoney(totalExpense) }}</span>
        <span>پرداخت اعتبار · {{ formatMoney(creditExpense) }}</span>
        <span>قسط‌های این ماه · {{ formatMoney(monthlyInstallmentDue) }}</span>
        <span>هزینه تکرارشونده · {{ formatMoney(monthlyRecurringExpenseTotal) }}</span>
        <span>خرج ضروری · {{ formatMoney(essentialExpense) }}</span>
        <span>خرج غیرضروری · {{ formatMoney(nonEssentialExpense) }}</span>
        <span>پول آزاد بعد تعهدات · {{ formatMoney(flexibleAfterCommitments) }}</span>
        <span>پس‌انداز · {{ formatMoney(balance) }}</span>
      </div>
    </article>

    <article class="glass-panel stats-card" data-section="آمار">
      <div class="section-title">
        <div>
          <h2>آمار و نمودارها</h2>
          <p>روند، بودجه، جریان پول و کیفیت هزینه‌ها</p>
        </div>
      </div>

      <div class="stats-grid analytics-stats-grid">
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

      <div class="stats-analysis-grid analytics-chart-grid">
        <section class="stats-chart-panel wide">
          <div class="section-title compact">
            <div>
              <h2>روند شش‌ماهه</h2>
              <p>درآمد، هزینه و مانده در ماه‌های اخیر</p>
            </div>
          </div>
          <div class="chart-canvas stats-line-chart" :class="{ empty: !hasMonthlyTrendData }">
            <canvas ref="statsMonthlyTrendCanvas" aria-label="نمودار روند شش‌ماهه" role="img" />
            <span v-if="!hasMonthlyTrendData">بدون داده</span>
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
              <h2>تعهدات ماهانه</h2>
              <p>اعتبار، قسط، هزینه‌های ثابت و پول آزاد</p>
            </div>
          </div>
          <div class="chart-canvas stats-polar-chart" :class="{ empty: !hasCommitmentData }">
            <canvas ref="statsCommitmentCanvas" aria-label="نمودار تعهدات ماهانه" role="img" />
            <span v-if="!hasCommitmentData">بدون داده</span>
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

        <section class="stats-chart-panel">
          <div class="section-title compact">
            <div>
              <h2>ضروری یا غیرضروری</h2>
              <p>کیفیت هزینه‌های این ماه</p>
            </div>
          </div>
          <div class="chart-canvas stats-polar-chart" :class="{ empty: !hasExpenseData }">
            <canvas ref="statsEssentialCanvas" aria-label="نمودار هزینه‌های ضروری و غیرضروری" role="img" />
            <span v-if="!hasExpenseData">بدون داده</span>
          </div>
        </section>

        <section class="stats-chart-panel">
          <div class="section-title compact">
            <div>
              <h2>روش پرداخت</h2>
              <p>مقایسه هزینه‌های نقدی و اعتباری</p>
            </div>
          </div>
          <div class="chart-canvas stats-cash-chart" :class="{ empty: !hasExpenseData }">
            <canvas ref="statsPaymentMethodCanvas" aria-label="نمودار روش پرداخت هزینه‌ها" role="img" />
            <span v-if="!hasExpenseData">بدون داده</span>
          </div>
        </section>
      </div>
    </article>
  </section>
</template>
