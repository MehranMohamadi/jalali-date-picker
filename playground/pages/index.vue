<script setup lang="ts">
import { ArrowLeft, CalendarDays, ChevronDown, Wallet, ReceiptText } from 'lucide-vue-next'
const { privateText } = usePrivacy()

const {
  widgets, today, dashboardCards, latestExpenses, totalBudget, totalExpense, balanceAfterCreditPayment,
  upcomingExpenseItems, cashflowRiskLevel, visibleCategoryTotals,
  getCategory, formatMoney, formatCompact, toPersianNumber, ignoreCreditMonth, openModal,
} = useBudgetyar()

const dailyWidgets = computed(() => widgets.value.slice(1, 4))
const primaryCards = computed(() => dashboardCards.value.slice(0, 2))
const remainingBudget = computed(() => totalBudget.value - totalExpense.value)
const budgetPercent = computed(() => totalBudget.value > 0 ? Math.round(totalExpense.value / totalBudget.value * 100) : 0)
const nextCommitment = computed(() => upcomingExpenseItems.value[0])
const topCategories = computed(() => visibleCategoryTotals.value.slice(0, 5))
function categoryShare(spent: number) {
  return totalExpense.value > 0 ? Math.round(spent / totalExpense.value * 100) : 0
}
</script>

<template>
  <div class="daily-dashboard">
    <header class="daily-heading">
      <h1>‏نمای امروز</h1>
      <span><CalendarDays :size="15" aria-hidden="true" />{{ today }}</span>
    </header>

    <section class="daily-strip glass-panel" aria-label="‏خلاصهٔ امروز">
      <div v-for="widget in dailyWidgets" :key="widget.label">
        <small>{{ widget.label }}</small><strong>{{ privateText(widget.value) }}</strong>
      </div>
    </section>

    <section class="daily-metrics" aria-label="‏وضعیت مالی">
      <article v-for="(card, index) in primaryCards" :key="card.label" class="daily-metric glass-panel" :class="{ 'daily-metric-primary': index === 0 }">
        <div class="daily-metric-line">
          <span><Wallet v-if="index === 0" :size="18" aria-hidden="true" /><ReceiptText v-else :size="18" aria-hidden="true" />{{ index === 0 ? '‏مانده پس از تعهدات' : card.label }}</span>
          <strong>{{ formatMoney(card.value) }}</strong>
        </div>
        <small>{{ privateText(card.hint) }}</small>
        <details v-if="index === 0 || card.details?.length" class="daily-breakdown">
          <summary>‏جزئیات محاسبه <ChevronDown :size="14" aria-hidden="true" /></summary>
          <div v-if="index === 0" class="daily-deduction">
            <span>‏مانده بدون کسر اقساط</span>
            <b>{{ formatMoney(balanceAfterCreditPayment) }}</b>
          </div>
          <div v-for="detail in card.details" :key="detail.label" class="daily-deduction">
            <span>{{ detail.label }}</span>
            <b>− {{ privateText(detail.value) }}</b>
            <button v-if="detail.actionId" type="button" :aria-label="`‏نادیده گرفتن ${detail.label}`" @click="ignoreCreditMonth(detail.actionId)">‏نادیده بگیر</button>
          </div>
        </details>
      </article>
    </section>

    <section class="daily-actions" aria-label="‏بودجه و پرداخت بعدی">
      <NuxtLink to="/budgets" class="daily-action glass-panel" :class="{ 'daily-warning': totalBudget > 0 && remainingBudget < 0 }">
        <div class="daily-action-head"><span>‏بودجهٔ این ماه</span><ArrowLeft :size="16" aria-hidden="true" /></div>
        <strong v-if="totalBudget > 0">{{ formatCompact(Math.abs(remainingBudget)) }} <small>{{ remainingBudget < 0 ? '‏بیش از بودجه' : '‏باقی‌مانده' }}</small></strong>
        <strong v-else>‏تعیین بودجهٔ ماه</strong>
        <div v-if="totalBudget > 0" class="daily-budget-track" aria-hidden="true"><i :style="{ width: `${Math.min(100, Math.max(0, budgetPercent))}%` }" /></div>
        <small>{{ totalBudget > 0 ? `‏${toPersianNumber(budgetPercent)}٪ مصرف شده · دیدن بودجه‌ها` : '‏برای دسته‌های خرجت سقف بگذار' }}</small>
      </NuxtLink>
      <NuxtLink :to="nextCommitment ? nextCommitment.path : '/planning#commitments'" class="daily-action glass-panel" :class="{ 'daily-warning': nextCommitment?.status === 'overdue' }">
        <div class="daily-action-head"><span>‏پرداخت بعدی</span><ArrowLeft :size="16" aria-hidden="true" /></div>
        <template v-if="nextCommitment">
          <strong class="daily-payment-title">{{ nextCommitment.title }}</strong>
          <b>{{ formatCompact(nextCommitment.amount) }}</b>
          <small>{{ nextCommitment.statusLabel }} · {{ nextCommitment.date }}</small>
        </template>
        <template v-else><strong>‏تعهدی ثبت نشده</strong><small>‏مشاهدهٔ برنامهٔ پرداخت‌ها</small></template>
      </NuxtLink>
    </section>

    <NuxtLink v-if="cashflowRiskLevel === 'danger'" to="/planning" class="daily-risk">
      <span>‏احتمال کمبود نقدینگی در برنامهٔ پرداخت‌ها</span><strong>‏بررسی برنامه ←</strong>
    </NuxtLink>

    <div class="daily-lists">
      <section class="daily-panel glass-panel">
        <header class="daily-panel-head"><h2>‏آخرین خرج‌ها</h2><NuxtLink to="/transactions">‏همهٔ تراکنش‌ها <ArrowLeft :size="14" aria-hidden="true" /></NuxtLink></header>
        <div v-if="latestExpenses.length" class="daily-expenses">
          <div v-for="expense in latestExpenses.slice(0, 4)" :key="expense.id" class="daily-expense">
            <span class="daily-category-icon" aria-hidden="true">{{ getCategory(expense.category).icon }}</span>
            <div><strong>{{ expense.title }}</strong><small>{{ getCategory(expense.category).label }} · {{ expense.date }}</small></div>
            <b :title="formatMoney(expense.amount)">{{ formatCompact(expense.amount) }}</b>
          </div>
        </div>
        <div v-else class="daily-empty"><p>‏اولین خرجت را ثبت کن تا اینجا ببینی.</p><button class="soft-button" type="button" @click="openModal('expense')">‏ثبت هزینه</button></div>
      </section>

      <section class="daily-panel glass-panel">
        <header class="daily-panel-head"><h2>‏دسته‌های پرخرج این ماه</h2><NuxtLink to="/analytics">‏تحلیل‌ها <ArrowLeft :size="14" aria-hidden="true" /></NuxtLink></header>
        <div v-if="topCategories.length" class="daily-categories">
          <div v-for="item in topCategories" :key="item.key" class="daily-category">
            <div><span>{{ item.icon }} {{ item.label }}</span><b>{{ formatCompact(item.spent) }} <small>· {{ toPersianNumber(categoryShare(item.spent)) }}٪</small></b></div>
            <div class="daily-category-track" aria-hidden="true"><i :style="{ width: `${Math.min(100, categoryShare(item.spent))}%`, background: item.color }" /></div>
          </div>
        </div>
        <p v-else class="daily-empty">‏بعد از ثبت هزینه، سهم دسته‌ها مشخص می‌شود.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.daily-dashboard { align-content: start; display: grid; gap: 10px; min-width: 0; }
.daily-heading, .daily-heading > span, .daily-metric-line, .daily-metric-line > span, .daily-action-head, .daily-panel-head, .daily-panel-head a { align-items: center; display: flex; gap: 8px; }
.daily-heading, .daily-metric-line, .daily-action-head, .daily-panel-head { justify-content: space-between; }
.daily-metric-line { flex-wrap: wrap; }
.daily-heading h1 { font-size: 1.1rem; margin: 0; }
.daily-heading > span { color: var(--muted); font-size: .78rem; }
.daily-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 9px 6px; }
.daily-strip > div { display: grid; gap: 4px; min-width: 0; padding-inline: 10px; }
.daily-strip > div + div { border-inline-start: 1px solid var(--line); }
.daily-strip small { font-size: .72rem; }
.daily-strip strong { font-size: .86rem; color: var(--text); font-variant-numeric: tabular-nums; }
.daily-metrics, .daily-actions, .daily-lists { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
.daily-actions { align-items: stretch; }
.daily-metric { padding: 11px 13px; display: grid; gap: 5px; min-width: 0; }
.daily-metric-primary { background: var(--primary); border-color: transparent; color: var(--on-primary); }
.daily-metric-primary .daily-metric-line > span, .daily-metric-primary > small, .daily-metric-primary .daily-breakdown summary { color: inherit; }
.daily-metric-primary :is(strong, b) { color: inherit; }
.daily-metric-primary .daily-breakdown { border-color: color-mix(in srgb, currentColor 16%, transparent); }
.daily-metric-primary .daily-deduction button { color: inherit; border-color: color-mix(in srgb, currentColor 20%, transparent); background: transparent; }
.daily-metric-line > span { color: var(--muted-2); font-size: .8rem; white-space: nowrap; }
.daily-metric-line > strong { font-size: .95rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.daily-metric > small { font-size: .72rem; }
.daily-breakdown { border-top: 1px solid var(--line); margin-top: 4px; padding-top: 7px; }
.daily-breakdown summary { cursor: pointer; color: var(--muted-2); display: flex; align-items: center; justify-content: space-between; font-size: .73rem; list-style: none; }
.daily-breakdown summary::-webkit-details-marker { display: none; }
.daily-breakdown[open] summary svg { transform: rotate(180deg); }
.daily-deduction { display: flex; align-items: center; flex-wrap: wrap; gap: 5px 8px; padding-top: 5px; font-size: .68rem; }
.daily-deduction b { margin-inline-start: auto; }
.daily-deduction button { color: var(--muted-2); border: 1px solid var(--line); border-radius: 6px; background: var(--panel-soft); padding: 4px 7px; }
.daily-action { display: grid; gap: 5px; min-width: 0; height: 100%; padding: 10px 12px; color: var(--text); text-decoration: none; }
.daily-action-head { color: var(--muted); font-size: .75rem; }
.daily-action > strong, .daily-action > b { font-size: .9rem; }
.daily-action > strong small, .daily-action > small { font-size: .71rem; font-weight: 400; }
.daily-payment-title { overflow-wrap: anywhere; }
.daily-budget-track, .daily-category-track { background: var(--line); border-radius: 8px; height: 5px; overflow: hidden; }
.daily-budget-track i, .daily-category-track i { background: var(--primary); display: block; height: 100%; border-radius: inherit; }
.daily-warning { border-color: var(--danger); }
.daily-warning .daily-budget-track i { background: var(--danger); }
.daily-risk { display: flex; flex-wrap: wrap; gap: 6px; justify-content: space-between; border: 1px solid color-mix(in srgb, var(--danger) 45%, transparent); background: color-mix(in srgb, var(--danger) 9%, var(--panel)); color: var(--text); border-radius: 8px; padding: 9px 12px; font-size: .76rem; text-decoration: none; }
.daily-panel { padding: 12px; min-width: 0; }
.daily-panel-head { margin-bottom: 8px; flex-wrap: wrap; }
.daily-panel-head h2 { font-size: .82rem; }
.daily-panel-head a { color: var(--primary); text-decoration: none; font-size: .72rem; }
.daily-expense { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 9px 0; }
.daily-expense + .daily-expense { border-top: 1px solid var(--line); }
.daily-category-icon { background: var(--panel-soft); border-radius: 9px; display: grid; place-items: center; height: 28px; }
.daily-expense > div { min-width: 0; display: grid; gap: 3px; }
.daily-expense strong { font-size: .81rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.daily-expense small { font-size: .68rem; }
.daily-expense > b { font-size: .75rem; white-space: nowrap; font-variant-numeric: tabular-nums; }
.daily-categories { display: grid; gap: 12px; }
.daily-category > div:first-child { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 7px; font-size: .78rem; }
.daily-category b { font-size: .75rem; white-space: nowrap; }
.daily-category b small { font-weight: 400; }
.daily-empty { display: grid; justify-items: start; gap: 10px; color: var(--muted); font-size: .8rem; padding: 12px 0; }
.daily-action:hover, .daily-action:focus-visible { border-color: var(--primary); }
@media (max-width: 1180px) { .daily-metrics { grid-template-columns: 1fr; } }
@media (max-width: 760px) {
  .daily-lists { grid-template-columns: 1fr; }
  .daily-heading h1 { font-size: 1.05rem; }
  .daily-heading > span { font-size: .7rem; }
  .daily-strip > div { padding-inline: 6px; }
  .daily-strip strong { font-size: .7rem; }
  .daily-strip small { font-size: .65rem; }
  .daily-actions { gap: 8px; }
  .daily-action { padding: 10px; }
  .daily-action > strong, .daily-action > b { font-size: .78rem; }
  .daily-action > strong small { display: block; margin-top: 4px; }
}
@media (max-width: 360px) {
  .daily-expense { grid-template-columns: 26px minmax(0, 1fr); }
  .daily-expense > b { grid-column: 2; }
  .daily-heading > span svg { display: none; }
  .daily-metric-line > strong { font-size: .86rem; }
  .daily-category b small { display: block; text-align: left; }
}
</style>
