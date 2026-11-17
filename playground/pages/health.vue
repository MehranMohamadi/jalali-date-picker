<script setup lang="ts">
const { amountsHidden, privateText } = usePrivacy()
import { summarizeFinancialHistory } from '../../src/utils/financialAdviceHistory'
import { toPersianDigits } from '../../src/utils/digits'

const budgetyar = useBudgetyar()
const {
  financialHealthScore,
  financialHealthLevel,
  financialHealthWarnings,
  financialHealthStrengths,
  getFinancialHealthLevelLabel,
  toPersianNumber,
  formatMoney,
  totalIncome,
  totalExpense,
  balance,
  totalDebtRemaining,
  monthlyInstallmentDue,
  totalMinimumDebtPayments,
  totalExtraDebtPayments,
  safeDailySpend,
  budgetUsage,
  incomeVolatilityPercent,
  currentMonthTransactions,
  transactions,
  todayKey,
  categoryTotals,
  getCategory,
  normalizeJalaliDate,
  balanceAfterCommitments,
  creditExpense,
  commitmentInstallmentDue,
  totalBudget,
  installmentMonthlySchedule,
  monthlyRecurringExpenseTotal,
  totalGoalsRemaining,
} = budgetyar

const analysisText = ref('')
const analysisError = ref('')
const isAnalyzing = ref(false)
const monthlyTotals = computed(() => {
  const posted = currentMonthTransactions.value.filter((item) => normalizeJalaliDate(item.date) <= todayKey.value)
  return {
    income: posted.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
    expense: posted.filter((item) => item.type === 'expense' && item.sourceType !== 'credit-payment').reduce((sum, item) => sum + item.amount, 0),
  }
})
const savingsRate = computed(() => monthlyTotals.value.income > 0
  ? Math.round((monthlyTotals.value.income - monthlyTotals.value.expense) / monthlyTotals.value.income * 100)
  : null)
const debtPayments = computed(() => totalMinimumDebtPayments.value + totalExtraDebtPayments.value + monthlyInstallmentDue.value)
const debtPressure = computed(() => monthlyTotals.value.income > 0
  ? Math.round(debtPayments.value / monthlyTotals.value.income * 100)
  : debtPayments.value > 0 ? null : 0)
const primaryHealthIndicators = computed(() => financialHealthScore.value.items
  .filter((item) => ['budgetDiscipline', 'cashflowSafety', 'nonEssentialSpending', 'assetGrowth'].includes(item.key))
  .map((item) => ({
    ...item,
    title: item.key === 'budgetDiscipline' ? '‏کنترل بودجه' : item.key === 'nonEssentialSpending' ? '‏هزینه غیرضروری' : item.title,
    message: item.key === 'budgetDiscipline'
      ? totalBudget.value > 0 ? `‏${toPersianDigits(budgetUsage.value)}٪ بودجه مصرف شده` : '‏سقف بودجه تعریف نشده است.'
      : item.message,
  })))

async function analyzeFinancialHealth() {
  if (isAnalyzing.value) return
  isAnalyzing.value = true
  analysisError.value = ''
  analysisText.value = ''

  const postedMonth = currentMonthTransactions.value.filter((item) => item.date <= todayKey.value)
  const monthlyIncome = postedMonth.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const monthlyExpense = postedMonth.filter((item) => item.type === 'expense' && item.sourceType !== 'credit-payment').reduce((sum, item) => sum + item.amount, 0)
  const history = summarizeFinancialHistory(transactions.value, todayKey.value, normalizeJalaliDate)
  const categoryHistory = history.categorySpending.map(({ key, spent }) => ({ name: getCategory(key).label.slice(0, 60), spent }))
  const allTimeCategories = categoryHistory.length > 100
    ? [...categoryHistory.slice(0, 99), { name: 'سایر دسته‌ها', spent: categoryHistory.slice(99).reduce((sum, item) => sum + item.spent, 0) }]
    : categoryHistory
  const snapshot = {
    date: todayKey.value,
    monthlyIncome,
    monthlyExpense,
    allTimeIncome: history.allTimeIncome,
    allTimeExpense: history.allTimeExpense,
    monthlyHistory: history.monthlyHistory,
    allTimeCategories,
    availableBalance: balanceAfterCommitments.value,
    monthlyBudget: totalBudget.value,
    unpaidCredit: creditExpense.value,
    dueInstallments: commitmentInstallmentDue.value,
    remainingInstallments: installmentMonthlySchedule.value.reduce((sum, month) => sum + month.remaining, 0),
    monthlyRecurringExpense: monthlyRecurringExpenseTotal.value,
    remainingGoals: totalGoalsRemaining.value,
    totalDebt: totalDebtRemaining.value,
    safeDailySpend: safeDailySpend.value,
    healthScore: financialHealthScore.value.totalScore,
    categories: categoryTotals.value.map((category) => ({
      name: getCategory(category.key).label.slice(0, 60),
      budget: category.budget,
      spent: postedMonth.filter((item) => item.type === 'expense' && item.sourceType !== 'credit-payment' && item.category === category.key).reduce((sum, item) => sum + item.amount, 0),
    })).sort((first, second) => second.spent - first.spent || second.budget - first.budget).slice(0, 30),
  }

  try {
    const response = await fetch('/api/financial-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    })
    const result = await response.json() as { analysis?: string; error?: string; statusMessage?: string }
    if (!response.ok || !result.analysis) throw new Error(result.error || result.statusMessage || 'تحلیل انجام نشد؛ دوباره تلاش کنید.')
    analysisText.value = result.analysis
  } catch (error) {
    analysisError.value = error instanceof SyntaxError
      ? '‏سرویس تحلیل در دسترس نیست؛ دوباره تلاش کنید.'
      : error instanceof Error ? error.message : 'تحلیل انجام نشد؛ دوباره تلاش کنید.'
  } finally {
    isAnalyzing.value = false
  }
}

const healthDetails = computed(() => [
  { label: 'نسبت درآمد به هزینه', value: totalExpense.value ? `${toPersianNumber(Math.round((totalIncome.value / totalExpense.value) * 100))}٪` : 'بدون هزینه', tone: totalIncome.value >= totalExpense.value ? 'positive' : 'danger', help: 'بیشتر از ۱۰۰٪ یعنی درآمد این ماه هزینه‌ها را پوشش می‌دهد.' },
  { label: 'نقدینگی فعلی', value: formatMoney(balance.value), tone: balance.value >= 0 ? 'positive' : 'danger', help: 'مبلغی که بعد از هزینه‌های ثبت‌شده در دسترس است.' },
  { label: 'بدهی باقی‌مانده', value: formatMoney(totalDebtRemaining.value), tone: totalDebtRemaining.value > 0 ? 'warning' : 'positive', help: 'اصل بدهی‌های فعالی که هنوز تسویه نشده‌اند.' },
  { label: 'تعهد ماهانه', value: formatMoney(monthlyInstallmentDue.value), tone: 'warning', help: 'مجموع اقساط سررسیدشده در ماه جاری.' },
  { label: 'سقف خرج امن روزانه', value: formatMoney(safeDailySpend.value), tone: 'positive', help: 'حد پیشنهادی خرج روزانه برای حفظ جریان نقدی.' },
  { label: 'نوسان درآمد', value: `${toPersianNumber(incomeVolatilityPercent.value)}٪`, tone: incomeVolatilityPercent.value > 35 ? 'warning' : 'positive', help: 'عدد کمتر یعنی درآمد قابل‌پیش‌بینی‌تر.' },
])
</script>

<template>
  <section class="health-page" aria-label="‏سلامت مالی">
    <article class="glass-panel health-score-card">
      <h2>‏امتیاز سلامت مالی</h2>
      <strong class="health-total-score">{{ privateText(`${toPersianDigits(financialHealthScore.totalScore)} از ۱۰۰ · ${getFinancialHealthLevelLabel(financialHealthLevel)}`) }}</strong>
      <p class="health-current-period">‏وضعیت این ماه</p>
      <small>‏از داده‌های ثبت‌شده محاسبه می‌شود.</small>
      <div class="health-progress" role="progressbar" aria-label="‏امتیاز سلامت مالی" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="amountsHidden ? undefined : financialHealthScore.totalScore" :aria-valuetext="amountsHidden ? '‏پنهان' : `${toPersianDigits(financialHealthScore.totalScore)} از ۱۰۰`">
        <i :style="{ width: `${amountsHidden ? 0 : financialHealthScore.totalScore}%` }" />
      </div>
    </article>

    <div class="health-metrics">
      <div><small>‏پس‌انداز</small><strong>{{ privateText(savingsRate === null ? '‏بدون درآمد' : `${toPersianDigits(savingsRate)}٪`) }}</strong></div>
      <div><small>‏فشار بدهی</small><strong>{{ privateText(debtPressure === null ? '‏بدون درآمد' : `${toPersianDigits(debtPressure)}٪`) }}</strong></div>
    </div>

    <section class="glass-panel health-indicators-card">
      <h2>‏شاخص‌های سلامت</h2>
      <div class="health-indicators">
        <article v-for="item in primaryHealthIndicators" :key="item.key" class="health-indicator">
          <h3>{{ item.title }}</h3>
          <p>{{ privateText(item.message) }}</p>
          <div class="health-progress" role="progressbar" :aria-label="item.title" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="amountsHidden ? undefined : item.score" :aria-valuetext="amountsHidden ? '‏پنهان' : `${toPersianDigits(item.score)} از ۱۰۰`">
            <i :style="{ width: `${amountsHidden ? 0 : item.score}%` }" />
          </div>
        </article>
      </div>
      <details class="health-extra-details">
        <summary>‏جزئیات شاخص‌ها</summary>
        <p class="health-explanation">‏امتیاز از ترکیب پس‌انداز، کنترل بودجه، فشار بدهی، امنیت جریان نقدی، هزینه‌های غیرضروری و رشد دارایی محاسبه می‌شود.</p>
    <section class="health-details" aria-label="‏شاخص‌های تکمیلی سلامت مالی">
      <article v-for="item in healthDetails" :key="item.label" class="health-detail" :class="item.tone">
        <small>{{ item.label }}</small>
        <strong>{{ privateText(item.value) }}</strong>
        <span>{{ item.help }}</span>
      </article>
    </section>

    <p class="health-budget-note">‏مصرف بودجهٔ دسته‌ها: {{ privateText(`${toPersianDigits(budgetUsage)}٪`) }}</p>

    <div class="installments-grid planning-card-grid planning-inline">
      <article v-for="item in financialHealthScore.items" :key="item.key" class="installment-item">
        <div class="installment-item-head">
          <div><strong>{{ item.title }}</strong><small>{{ item.message }}</small></div>
          <span>{{ privateText(toPersianDigits(item.score)) }}</span>
        </div>
        <div class="health-progress" aria-hidden="true">
          <i :style="{ width: `${amountsHidden ? 0 : item.score}%` }" />
        </div>
      </article>
    </div>

    <div v-if="financialHealthStrengths.length" class="insights planning-inline">
      <span v-for="item in financialHealthStrengths" :key="item">{{ privateText(item) }}</span>
    </div>

    <div v-if="financialHealthWarnings.length" class="insights planning-warnings">
      <span v-for="item in financialHealthWarnings" :key="item">{{ privateText(item) }}</span>
    </div>
      </details>
    </section>

    <section class="glass-panel financial-ai-advice" :aria-busy="isAnalyzing">
      <h2>‏تحلیل هوشمند مالی</h2>
      <p>‏با زدن تحلیل، خلاصه‌های مالی ارسال می‌شوند؛ جزئیات تراکنش‌ها ارسال نمی‌شوند.</p>
      <button class="primary-button" type="button" :disabled="isAnalyzing" @click="analyzeFinancialHealth">{{ isAnalyzing ? '‏در حال تحلیل…' : '‏تحلیل کن' }}</button>
      <p v-if="analysisError" class="financial-ai-error" role="alert">{{ analysisError }}</p>
      <div v-if="analysisText" class="financial-ai-result" aria-live="polite">{{ privateText(analysisText) }}</div>
    </section>
    <p class="health-advice-note">‏پیشنهادها بر پایهٔ اطلاعات ثبت‌شده‌اند و جایگزین مشاورهٔ تخصصی نیستند.</p>
  </section>
</template>

<style scoped>
.health-page { display: grid; gap: 12px; min-width: 0; }
.health-page > .glass-panel { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; min-width: 0; padding: 14px; }
.health-page h2 { color: var(--text); font-size: .9rem; font-weight: 600; margin: 0 0 14px; }
.health-total-score { color: var(--primary); display: block; font-size: 1.6rem; font-weight: 650; line-height: 1.6; overflow-wrap: anywhere; }
.health-score-card .health-current-period { color: var(--muted-2); font-size: .75rem; margin: 0 0 14px; }
.health-score-card > small { color: var(--muted); font-size: .625rem; }
.health-score-card .health-progress { margin-top: 18px; }
.health-progress { background: var(--panel-soft); border-radius: 999px; height: 5px; overflow: hidden; }
.health-progress i { background: var(--primary); border-radius: inherit; display: block; height: 100%; margin-inline-end: auto; }
.health-metrics { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.health-metrics > div { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; display: grid; gap: 12px; min-width: 0; padding: 12px; }
.health-metrics small { color: var(--muted); font-size: .6875rem; }
.health-metrics strong { color: var(--text); font-size: 1.05rem; font-weight: 600; }
.health-indicators { display: grid; gap: 20px; }
.health-indicator h3 { color: var(--text); font-size: .8125rem; font-weight: 400; margin: 0 0 10px; }
.health-indicator > p { color: var(--muted); font-size: .6875rem; line-height: 1.8; margin: 0 0 14px; }
.health-extra-details { color: var(--muted); font-size: .6875rem; margin-top: 14px; min-width: 0; }
.health-extra-details > summary { cursor: pointer; }
.health-extra-details .health-explanation { font-size: .6875rem; line-height: 1.8; margin-top: 12px; }
.health-extra-details .health-detail { background: var(--bg-2); border-color: var(--line); }
.health-extra-details .installment-item { background: var(--bg-2); border: 1px solid var(--line); }
.health-extra-details .insights { background: var(--panel-soft); border-color: var(--line-strong); }
.health-extra-details .insights > span { color: var(--muted-2); }
.financial-ai-advice > p { color: var(--muted); font-size: .6875rem; line-height: 1.8; margin: 0 0 12px; }
.financial-ai-advice > button { display: flex; justify-content: center; min-height: 44px; width: 100%; }
.financial-ai-advice .financial-ai-error { color: var(--danger); margin: 12px 0 0; }
.financial-ai-advice .financial-ai-result { background: var(--bg-2); border: 1px solid var(--line); border-radius: 14px; color: var(--text); font-size: .8125rem; line-height: 2; margin-top: 12px; overflow-wrap: anywhere; padding: 12px; white-space: pre-wrap; }
.health-advice-note { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 17px; color: var(--muted); font-size: .6875rem; line-height: 1.8; margin: 0; padding: 12px 14px; }
@media (min-width: 1000px) {
  .health-page { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .health-indicators-card, .health-advice-note { grid-column: 1 / -1; }
  .health-indicators { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .health-page .financial-ai-advice { grid-column: 1 / -1; }
}
</style>
