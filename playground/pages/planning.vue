<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

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
} = budgetyar

const visibleTimeline = computed(() =>
  cashflowForecastDays.value
    .filter((day) => day.income || day.expense || day.warnings.length)
    .slice(0, 12),
)
</script>

<template>
  <section class="glass-panel settings-card">
    <div class="section-title">
      <div>
        <h2>برنامه‌ریزی مالی</h2>
        <p>پیش‌بینی نقدینگی و تصمیم‌یار خرید</p>
      </div>
      <div class="segmented compact-toggle">
        <button type="button" :class="{ active: cashflowForecastPeriod === 'untilEndOfMonth' }" @click="cashflowForecastPeriod = 'untilEndOfMonth'">تا آخر ماه</button>
        <button type="button" :class="{ active: cashflowForecastPeriod === 'next30Days' }" @click="cashflowForecastPeriod = 'next30Days'">۳۰ روز</button>
        <button type="button" :class="{ active: cashflowForecastPeriod === 'next90Days' }" @click="cashflowForecastPeriod = 'next90Days'">۹۰ روز</button>
      </div>
    </div>

    <div class="report-grid">
      <span><small>مانده پایان دوره</small><strong>{{ formatMoney(projectedEndOfMonthBalance) }}</strong></span>
      <span><small>کمترین مانده</small><strong>{{ formatMoney(lowestProjectedBalance) }}</strong></span>
      <span><small>خرج امن روزانه</small><strong>{{ formatMoney(safeDailySpend) }}</strong></span>
      <span><small>ریسک</small><strong>{{ getRiskLabel(cashflowRiskLevel) }}</strong></span>
    </div>

    <section class="weekly-category-budget glass-panel planning-inline">
      <div class="weekly-category-head">
        <strong>خط زمانی نقدینگی</strong>
        <small>خرج امن هفتگی: {{ formatMoney(safeWeeklySpend) }}</small>
      </div>
      <div v-if="visibleTimeline.length" class="cashflow-timeline">
        <span v-for="day in visibleTimeline" :key="day.date" :class="{ danger: day.projectedBalance < 0, watch: day.warnings.length && day.projectedBalance >= 0 }">
          <b>{{ day.date }}</b>
          <em>درآمد {{ formatCompact(day.income) }} · هزینه {{ formatCompact(day.expense) }}</em>
          <strong>{{ formatCompact(day.projectedBalance) }}</strong>
        </span>
      </div>
      <p v-else class="empty-inline">در دوره انتخابی فشار نقدی خاصی دیده نمی‌شود.</p>
    </section>

    <div v-if="cashflowWarnings.length" class="insights planning-warnings">
      <span v-for="warning in cashflowWarnings" :key="warning">{{ warning }}</span>
    </div>

    <section class="glass-panel reports-card planning-inline">
      <div class="section-title compact">
        <div>
          <h2>تصمیم‌یار خرید</h2>
          <p>قبل از خرج کردن ببین خرید چقدر به بودجه فشار می‌آورد.</p>
        </div>
      </div>

      <form class="installment-form planning-form purchase-form" @submit.prevent>
        <label>
          <span>مبلغ خرید</span>
          <input :value="formatMoneyInput(purchaseForm.amount)" inputmode="numeric" @input="updateMoneyInput(purchaseForm, 'amount', $event)" />
          <small v-if="purchaseAmountInWords" class="amount-in-words">{{ purchaseAmountInWords }}</small>
        </label>
        <label>
          <span>دسته</span>
          <select v-model="purchaseForm.categoryId">
            <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
          </select>
        </label>
        <label>
          <span>تاریخ خرید</span>
          <JalaliDatePicker v-model="purchaseDatePickerValue" class="date-picker-field" :clearable="false" popover-class="date-picker-popover" />
        </label>
        <label>
          <span>روش پرداخت</span>
          <select v-model="purchaseForm.paymentMethod">
            <option value="cash">نقدی</option>
            <option value="credit">اعتباری</option>
          </select>
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
        <p>{{ purchaseDecision.summary }}</p>
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
          <span v-for="suggestion in purchaseDecision.suggestions" :key="suggestion">{{ suggestion }}</span>
        </div>
        <button class="primary-button full" type="button" :disabled="!purchaseForm.amount" @click="createPurchaseTransaction">
          <Plus :size="17" aria-hidden="true" />
          <span>ثبت این خرید به عنوان تراکنش</span>
        </button>
      </div>
    </section>
  </section>
</template>
