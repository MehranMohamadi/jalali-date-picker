<script setup lang="ts">
const { amountsHidden, privateText } = usePrivacy()
import { Plus } from 'lucide-vue-next'
import { toPersianDigits } from '../../src/utils/digits'

const budgetyar = useBudgetyar()
const {
  cashflowForecastPeriod,
  cashflowForecastDays,
  projectedEndOfMonthBalance,
  lowestProjectedBalance,
  cashflowRiskLevel,
  cashflowWarnings,
  safeDailySpend,
  safeWeeklySpend,
  purchaseForm,
  purchaseAmountInWords,
  purchaseDatePickerValue,
  purchaseDecision,
  categories,
  formatMoneyInput,
  formatMoney,
  formatCompact,
  toPersianNumber,
  updateMoneyInput,
  createPurchaseTransaction,
  getCategory,
  getRiskLabel,
  activeGoals,
  upcomingExpenseItems,
  getGoalProgress,
  getGoalSuggestedWeeklySaving,
  getGoalSummary,
  formatGoalTrackedAmount,
} = budgetyar

const visibleTimeline = computed(() =>
  cashflowForecastDays.value
    .filter((day) => day.income || day.expense || day.warnings.length)
    .slice(0, 12),
)

const totalUpcomingExpense = computed(() => upcomingExpenseItems.value.reduce((sum, item) => sum + item.amount, 0))
const showAllCommitments = ref(false)
const visibleCommitments = computed(() => showAllCommitments.value ? upcomingExpenseItems.value : upcomingExpenseItems.value.slice(0, 2))
const featuredGoal = computed(() => {
  const goal = activeGoals.value[0]
  return goal ? { goal, snapshot: getGoalSummary(goal) } : null
})

// Use each interval's lowest balance so short cash shortages stay visible.
const forecastChart = computed(() => {
  const days = cashflowForecastDays.value
  const count = Math.min(10, days.length)
  const points = Array.from({ length: count }, (_, index) => {
    const bucket = days.slice(Math.floor(index * days.length / count), Math.floor((index + 1) * days.length / count))
    return bucket.reduce((lowest, day) => day.projectedBalance < lowest.projectedBalance ? day : lowest)
  })
  const maximum = Math.max(0, ...points.map((day) => day.projectedBalance))
  const minimum = Math.min(0, ...points.map((day) => day.projectedBalance))
  const scale = (value: number) => 8 + (maximum - value) / (maximum - minimum || 1) * 104
  const baseline = scale(0)
  return {
    baseline,
    hasBalance: maximum !== 0 || minimum !== 0,
    bars: points.map((day, index) => ({
      ...day,
      x: (count - index - 1) * (340 / count) + 10,
      y: Math.min(baseline, scale(day.projectedBalance)),
      width: 340 / count - 7,
      height: Math.abs(scale(day.projectedBalance) - baseline),
      near: index < 4,
    })),
  }
})
</script>

<template>
  <section class="planning-page" aria-label="‏برنامه‌ریزی مالی">
      <div class="segmented compact-toggle planning-periods" role="group" aria-label="‏بازه پیش‌بینی">
        <button type="button" :class="{ active: cashflowForecastPeriod === 'untilEndOfMonth' }" :aria-pressed="cashflowForecastPeriod === 'untilEndOfMonth'" @click="cashflowForecastPeriod = 'untilEndOfMonth'">‏تا آخر ماه</button>
        <button type="button" :class="{ active: cashflowForecastPeriod === 'next30Days' }" :aria-pressed="cashflowForecastPeriod === 'next30Days'" @click="cashflowForecastPeriod = 'next30Days'">‏۳۰ روز</button>
        <button type="button" :class="{ active: cashflowForecastPeriod === 'next90Days' }" :aria-pressed="cashflowForecastPeriod === 'next90Days'" @click="cashflowForecastPeriod = 'next90Days'">‏۹۰ روز</button>
      </div>

    <div class="planning-metrics">
      <div><small>‏مانده پایان دوره</small><strong>{{ formatCompact(projectedEndOfMonthBalance) }}</strong></div>
      <div><small>‏کمترین مانده</small><strong>{{ formatCompact(lowestProjectedBalance) }}</strong></div>
      <div><small>‏خرج امن روزانه</small><strong>{{ formatCompact(safeDailySpend) }}</strong></div>
      <div><small>‏ریسک</small><strong :class="`risk-${cashflowRiskLevel}`">{{ getRiskLabel(cashflowRiskLevel) }}</strong></div>
    </div>

    <section class="glass-panel planning-panel planning-cashflow">
      <h2>‏خط زمانی نقدینگی</h2>
      <p v-if="amountsHidden" class="empty-inline">‏مبلغ‌ها پنهان هستند.</p>
      <svg v-else-if="forecastChart.hasBalance" class="planning-forecast-chart" viewBox="0 0 360 140" role="img" aria-label="‏کمترین مانده پیش‌بینی‌شده در بازه‌های زمانی">
        <line x1="10" x2="350" :y1="forecastChart.baseline" :y2="forecastChart.baseline" class="forecast-baseline" />
        <g v-for="bar in forecastChart.bars" :key="bar.date">
          <rect :x="bar.x" :y="bar.y" :width="bar.width" :height="bar.height" rx="4" class="forecast-bar" :class="{ near: bar.near, negative: bar.projectedBalance < 0 }">
            <title>{{ bar.date }} · {{ formatMoney(bar.projectedBalance) }}</title>
          </rect>
          <text :x="bar.x + bar.width / 2" y="132" text-anchor="middle">{{ toPersianDigits(bar.date.slice(5)) }}</text>
        </g>
      </svg>
      <p v-else class="empty-inline">‏برای نمایش نمودار، درآمد و هزینه‌های خود را ثبت کنید.</p>
      <details class="planning-timeline-details">
      <summary>‏جزئیات پیش‌بینی</summary>
      <p class="planning-chart-note">‏کمترین مانده در هر بازه · خرج امن هفتگی: {{ formatMoney(safeWeeklySpend) }}</p>
      <div v-if="visibleTimeline.length" class="cashflow-timeline">
        <span v-for="day in visibleTimeline" :key="day.date" :class="{ danger: day.projectedBalance < 0, watch: day.warnings.length && day.projectedBalance >= 0 }">
          <b>{{ day.date }}</b>
          <em>درآمد {{ formatCompact(day.income) }} · هزینه {{ formatCompact(day.expense) }}</em>
          <strong>{{ formatCompact(day.projectedBalance) }}</strong>
        </span>
      </div>
      <p v-else class="empty-inline">در دوره انتخابی فشار نقدی خاصی دیده نمی‌شود.</p>
      </details>
    </section>

    <div v-if="cashflowWarnings.length" class="insights planning-warnings">
      <span v-for="warning in cashflowWarnings" :key="warning">{{ privateText(warning) }}</span>
    </div>

    <div class="planning-action-grid">
      <section class="glass-panel planning-panel planning-goals-panel">
        <h2>‏مسیر هدف‌ها</h2>
        <div v-if="featuredGoal" class="planning-goal-preview">
          <div>
            <h3>{{ featuredGoal.goal.title }}</h3>
            <small>{{ formatGoalTrackedAmount(featuredGoal.goal, featuredGoal.snapshot.mode === 'ASSET_HOLDING' ? featuredGoal.snapshot.currentQuantity : featuredGoal.snapshot.netSavedAmount, true) }} ‏از {{ formatGoalTrackedAmount(featuredGoal.goal, featuredGoal.snapshot.mode === 'ASSET_HOLDING' ? featuredGoal.goal.targetQuantity ?? featuredGoal.goal.targetAmount : featuredGoal.snapshot.currentRequiredAmount ?? featuredGoal.goal.targetAmount, true) }}</small>
            <div class="progress-track" role="progressbar" :aria-label="featuredGoal.goal.title" :aria-valuenow="amountsHidden ? undefined : Math.min(100, Math.max(0, getGoalProgress(featuredGoal.goal)))" :aria-valuetext="amountsHidden ? '‏پنهان' : `${toPersianNumber(getGoalProgress(featuredGoal.goal))}٪`" :aria-valuemin="0" :aria-valuemax="100"><i :style="{ width: amountsHidden ? '0%' : `${Math.min(100, getGoalProgress(featuredGoal.goal))}%` }" /></div>
            <small class="planning-goal-weekly">‏پیشنهاد هفتگی: {{ formatMoney(getGoalSuggestedWeeklySaving(featuredGoal.goal)) }}</small>
          </div>
        </div>
        <p v-else class="empty-inline">هنوز هدف فعالی ثبت نشده است.</p>
        <NuxtLink to="/goals" class="soft-button planning-goals-link">‏همه هدف‌ها</NuxtLink>
      </section>

      <section id="commitments" class="glass-panel planning-panel planning-commitments">
        <h2>‏تعهدات پیش‌رو</h2>
        <div v-if="upcomingExpenseItems.length" id="planning-commitment-list" class="planning-list">
          <NuxtLink
            v-for="item in visibleCommitments"
            :key="item.id"
            :to="item.path"
            class="planning-list-item compact-item planning-commitment-link"
            :class="{ overdue: item.status === 'overdue' }"
          >
            <span>{{ item.icon }} {{ item.title }}<small>{{ item.typeLabel }} · {{ item.statusLabel }} · {{ toPersianDigits(item.date) }}</small></span>
            <b>{{ formatMoney(item.amount) }}</b>
          </NuxtLink>
        </div>
        <p v-else class="empty-inline">‏تعهد نزدیکی ثبت نشده است.</p>
        <button v-if="upcomingExpenseItems.length > 2" class="soft-button planning-more-commitments" type="button" :aria-expanded="showAllCommitments" aria-controls="planning-commitment-list" @click="showAllCommitments = !showAllCommitments">{{ showAllCommitments ? '‏نمایش کمتر' : '‏همه تعهدات' }}</button>
        <small v-if="upcomingExpenseItems.length" class="planning-commitments-total">‏مجموع تعهدات: {{ formatMoney(totalUpcomingExpense) }}</small>
      </section>
    </div>

    <details class="planning-purchase">
      <summary class="primary-button">‏تصمیم‌یار خرید</summary>
      <section class="glass-panel reports-card planning-panel">
      <div class="section-title compact">
        <div>
          <h2>تصمیم‌یار خرید</h2>
          <p>قبل از خرج کردن ببین خرید چقدر به بودجه فشار می‌آورد.</p>
        </div>
      </div>

      <form class="installment-form planning-form purchase-form" @submit.prevent>
        <label>
          <span>مبلغ خرید</span>
          <input :disabled="amountsHidden" :value="amountsHidden ? '••••' : formatMoneyInput(purchaseForm.amount)" inputmode="numeric" @input="updateMoneyInput(purchaseForm, 'amount', $event)" />
          <small v-if="purchaseAmountInWords" class="amount-in-words">{{ privateText(purchaseAmountInWords) }}</small>
        </label>
        <label>
          <span>دسته</span>
          <BudgetyarSelect v-model="purchaseForm.categoryId">
            <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
          </BudgetyarSelect>
        </label>
        <label>
          <span>تاریخ خرید</span>
          <JalaliDatePicker v-model="purchaseDatePickerValue" class="date-picker-field" :clearable="false" popover-class="date-picker-popover" />
        </label>
        <label>
          <span>روش پرداخت</span>
          <BudgetyarSelect v-model="purchaseForm.paymentMethod">
            <option value="cash">نقدی</option>
            <option value="credit">اعتباری</option>
          </BudgetyarSelect>
        </label>
        <label class="check-row">
          <input v-model="purchaseForm.isEssential" type="checkbox" />
          <span>ضروری است</span>
        </label>
        <label class="installment-description">
          <span>توضیح</span>
          <textarea v-model="purchaseForm.note" rows="2" placeholder="اختیاری" />
        </label>
      </form>

      <div class="decision-result" :class="purchaseDecision.level">
        <div class="installment-item-head">
          <div>
            <strong>{{ purchaseDecision.title }}</strong>
            <small>امتیاز {{ toPersianNumber(purchaseDecision.score) }} از ۱۰۰ · {{ getCategory(purchaseForm.categoryId).label }}</small>
          </div>
          <span>{{ purchaseDecision.level === 'safe' ? 'امن' : purchaseDecision.level === 'caution' ? 'با احتیاط' : 'پرریسک' }}</span>
        </div>
        <p>{{ privateText(purchaseDecision.summary) }}</p>
        <div class="report-grid">
          <span><small>مانده دسته بعد خرید</small><strong>{{ formatMoney(purchaseDecision.budgetImpact.categoryRemainingAfter) }}</strong></span>
          <span><small>اثر روی هفته</small><strong>{{ toPersianNumber(purchaseDecision.budgetImpact.weeklyBudgetImpactPercent) }}٪</strong></span>
          <span><small>مانده پایان دوره</small><strong>{{ formatMoney(purchaseDecision.cashflowImpact.projectedBalanceAfter) }}</strong></span>
          <span><small>اعتبار بعد خرید</small><strong>{{ purchaseDecision.creditImpact ? formatMoney(purchaseDecision.creditImpact.creditRemainingAfter) : 'ندارد' }}</strong></span>
        </div>
        <div v-if="purchaseDecision.goalImpact.delayedGoals.length" class="mobile-category-list">
          <span v-for="goal in purchaseDecision.goalImpact.delayedGoals" :key="goal.goalId">
            <b>{{ goal.title }}</b>
            <em>{{ toPersianNumber(goal.estimatedDelayDays) }} روز تاخیر احتمالی</em>
          </span>
        </div>
        <div v-if="purchaseDecision.suggestions.length" class="insights">
          <span v-for="suggestion in purchaseDecision.suggestions" :key="suggestion">{{ privateText(suggestion) }}</span>
        </div>
        <button class="primary-button full" type="button" :disabled="!purchaseForm.amount" @click="createPurchaseTransaction">
          <Plus :size="17" aria-hidden="true" />
          <span>ثبت این خرید به عنوان تراکنش</span>
        </button>
      </div>
    </section>
    </details>
  </section>
</template>

<style scoped>
.planning-page { display: grid; gap: 10px; min-width: 0; }
.planning-page .planning-periods { background: transparent; border: 0; display: grid; gap: 6px; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 0; }
.planning-page .planning-periods button { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 16px; color: var(--text); font-size: .75rem; min-height: 38px; padding: 7px; }
.planning-page .planning-periods button.active { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.planning-metrics { display: grid; gap: 8px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.planning-metrics > div { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 16px; display: grid; gap: 6px; min-width: 0; padding: 12px; }
.planning-metrics small { color: var(--muted); font-size: .6875rem; }
.planning-metrics strong { color: var(--text); font-size: 1.05rem; font-weight: 600; overflow-wrap: anywhere; }
.planning-metrics .risk-danger { color: var(--danger); }
.planning-page .planning-panel { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; margin: 0; min-width: 0; padding: 14px; }
.planning-panel h2 { color: var(--text); font-size: .875rem; font-weight: 600; margin: 0 0 12px; }
.planning-panel h3 { color: var(--text); font-size: .8125rem; font-weight: 500; margin: 0 0 10px; }
.planning-forecast-chart { display: block; max-height: 200px; width: 100%; }
.forecast-baseline { stroke: var(--line-strong); stroke-width: 1; }
.forecast-bar { fill: color-mix(in srgb, var(--muted) 55%, var(--panel)); }
.forecast-bar.near { fill: var(--primary); }
.forecast-bar.negative { fill: var(--danger); }
.planning-forecast-chart text { direction: ltr; fill: var(--muted); font-family: inherit; font-size: 8px; }
.planning-timeline-details { color: var(--muted); font-size: .6875rem; margin-top: 8px; }
.planning-timeline-details summary { cursor: pointer; width: fit-content; }
.planning-chart-note { font-size: .6875rem; line-height: 1.8; margin: 8px 0; }
.planning-page .cashflow-timeline { gap: 6px; margin-top: 8px; }
.planning-page .cashflow-timeline > span { background: var(--bg-2); border-color: var(--line); }
.planning-page .cashflow-timeline strong { color: var(--primary); }
.planning-page .cashflow-timeline .danger strong { color: var(--danger); }
.planning-page .planning-action-grid { align-items: start; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.planning-goal-preview small { color: var(--muted); display: block; font-size: .6875rem; line-height: 1.8; }
.planning-goal-preview .progress-track { background: var(--panel-soft); height: 5px; margin-top: 12px; }
.planning-goal-preview .progress-track i { background: var(--primary); margin-inline-end: auto; }
.planning-goal-weekly { margin-top: 6px; }
.planning-page .planning-goals-link, .planning-more-commitments { align-items: center; background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 13px; color: var(--text); display: flex; font-size: .75rem; justify-content: center; margin-top: 10px; min-height: 38px; text-decoration: none; width: 100%; }
.planning-page .planning-list { gap: 8px; }
.planning-page .planning-commitment-link { align-items: center; background: transparent; border: 1px solid var(--line-strong); border-radius: 16px; display: flex; flex-direction: row; gap: 10px; min-height: 66px; padding: 12px; }
.planning-commitment-link > span { font-size: .75rem; min-width: 0; overflow-wrap: anywhere; }
.planning-commitment-link small { font-size: .625rem; line-height: 1.8; }
.planning-page .planning-commitment-link b { color: var(--primary); font-size: .6875rem; font-weight: 500; }
.planning-page .planning-commitment-link.overdue { border-color: var(--danger); }
.planning-commitments-total { color: var(--muted); display: block; font-size: .625rem; margin-top: 10px; }
.planning-page .planning-warnings { background: var(--panel); border-color: var(--line-strong); border-inline-start: 2px solid var(--danger); border-radius: 14px; margin: 0; padding: 10px 12px; }
.planning-warnings span { color: var(--muted-2); font-size: .75rem; }
.planning-page .empty-inline { color: var(--muted); font-size: .75rem; line-height: 1.8; margin: 8px 0; }
.planning-purchase > summary { cursor: pointer; display: flex; justify-content: center; list-style: none; min-height: 42px; text-align: center; width: 100%; }
.planning-purchase > summary::-webkit-details-marker { display: none; }
.planning-purchase[open] > summary { margin-bottom: 10px; }
.planning-purchase .section-title p { color: var(--muted); font-size: .75rem; }
@media (max-width: 760px) {
  .planning-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .planning-metrics > div { padding: 10px 12px; }
  .planning-page .planning-action-grid { grid-template-columns: minmax(0, 1fr); }
  .planning-page .planning-panel { padding: 12px; }
  .planning-page .planning-commitment-link { gap: 6px; padding: 10px; }
  .planning-page .planning-commitment-link b { flex-shrink: 1; max-width: 40%; white-space: normal; }
}
</style>
