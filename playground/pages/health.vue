<script setup lang="ts">
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
  safeDailySpend,
  budgetUsage,
  incomeVolatilityPercent,
  currentMonthTransactions,
  todayKey,
  categoryTotals,
  getCategory,
  balanceAfterCommitments,
  creditExpense,
  commitmentInstallmentDue,
  totalBudget,
} = budgetyar

const analysisText = ref('')
const analysisError = ref('')
const isAnalyzing = ref(false)

async function analyzeFinancialHealth() {
  if (isAnalyzing.value) return
  isAnalyzing.value = true
  analysisError.value = ''
  analysisText.value = ''

  const postedMonth = currentMonthTransactions.value.filter((item) => item.date <= todayKey.value)
  const monthlyIncome = postedMonth.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const monthlyExpense = postedMonth.filter((item) => item.type === 'expense' && item.sourceType !== 'credit-payment').reduce((sum, item) => sum + item.amount, 0)
  const snapshot = {
    date: todayKey.value,
    monthlyIncome,
    monthlyExpense,
    availableBalance: balanceAfterCommitments.value,
    monthlyBudget: totalBudget.value,
    unpaidCredit: creditExpense.value,
    dueInstallments: commitmentInstallmentDue.value,
    totalDebt: totalDebtRemaining.value,
    safeDailySpend: safeDailySpend.value,
    healthScore: financialHealthScore.value.totalScore,
    categories: categoryTotals.value.map((category) => ({
      name: getCategory(category.key).label,
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
      ? 'سرویس تحلیل در این نسخه فعال نیست؛ برنامه را از سرور توسعه یا استقرار Vercel اجرا کنید.'
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
  <section class="glass-panel settings-card">
    <div class="section-title">
      <div>
        <h2>سلامت مالی</h2>
        <p>امتیاز ۰ تا ۱۰۰ برای وضعیت مالی این ماه</p>
      </div>
    </div>

    <article class="decision-result" :class="financialHealthLevel">
      <div class="installment-item-head">
        <div>
          <strong>امتیاز سلامت مالی: {{ toPersianNumber(financialHealthScore.totalScore) }}</strong>
          <small>{{ getFinancialHealthLevelLabel(financialHealthLevel) }}</small>
        </div>
        <span>{{ getFinancialHealthLevelLabel(financialHealthLevel) }}</span>
      </div>
      <div class="progress">
        <i :style="{ width: `${financialHealthScore.totalScore}%` }" />
      </div>
      <small class="health-explanation">امتیاز از ترکیب پس‌انداز، کنترل بودجه، فشار بدهی، امنیت جریان نقدی، هزینه‌های غیرضروری و رشد دارایی محاسبه می‌شود.</small>
      <p>برای دریافت توصیه‌های شخصی‌سازی‌شده، دکمهٔ تحلیل را بزنید.</p>
    </article>

    <section class="health-details planning-inline" aria-label="شاخص‌های تکمیلی سلامت مالی">
      <article v-for="item in healthDetails" :key="item.label" class="health-detail" :class="item.tone">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.help }}</span>
      </article>
    </section>

    <p class="health-budget-note">مصرف بودجه‌ی دسته‌ها: {{ toPersianNumber(budgetUsage) }}٪</p>

    <div class="installments-grid planning-card-grid planning-inline">
      <article v-for="item in financialHealthScore.items" :key="item.key" class="installment-item">
        <div class="installment-item-head">
          <div><strong>{{ item.title }}</strong><small>{{ item.message }}</small></div>
          <span>{{ toPersianNumber(item.score) }}</span>
        </div>
        <div class="progress" :class="{ danger: item.score < 50 }">
          <i :style="{ width: `${item.score}%` }" />
        </div>
      </article>
    </div>

    <div v-if="financialHealthStrengths.length" class="insights planning-inline">
      <span v-for="item in financialHealthStrengths" :key="item">{{ item }}</span>
    </div>

    <div v-if="financialHealthWarnings.length" class="insights planning-warnings">
      <span v-for="item in financialHealthWarnings" :key="item">{{ item }}</span>
    </div>

    <div class="weekly-category-budget glass-panel planning-inline financial-ai-advice">
      <div class="weekly-category-head"><strong>تحلیل هوشمند مالی</strong><small>با GapGPT</small></div>
      <p>فقط با زدن دکمه، خلاصهٔ عددی این ماه و نام دسته‌ها برای تحلیل ارسال می‌شود؛ جزئیات تراکنش‌ها ارسال نمی‌شود.</p>
      <button class="primary-button" type="button" :disabled="isAnalyzing" @click="analyzeFinancialHealth">{{ isAnalyzing ? 'در حال تحلیل…' : 'تحلیل کن' }}</button>
      <p v-if="analysisError" class="financial-ai-error" role="alert">{{ analysisError }}</p>
      <div v-if="analysisText" class="financial-ai-result" aria-live="polite">{{ analysisText }}</div>
      <small v-if="analysisText">این پیشنهادها بر پایهٔ داده‌های ثبت‌شده‌اند و جایگزین مشاورهٔ مالی تخصصی نیستند.</small>
    </div>
  </section>
</template>
