<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  financialHealthScore,
  financialHealthLevel,
  financialHealthSuggestions,
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
} = budgetyar

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
      <p>{{ financialHealthSuggestions[0] || 'وضعیت کلی قابل مدیریت است.' }}</p>
    </article>

    <section class="health-details planning-inline" aria-label="شاخص‌های تکمیلی سلامت مالی">
      <article v-for="item in healthDetails" :key="item.label" class="health-detail" :class="item.tone">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.help }}</span>
      </article>
    </section>

    <p class="health-budget-note">مصرف بودجه‌ی دسته‌ها: {{ toPersianNumber(budgetUsage) }}٪. برای بهبود امتیاز، ابتدا هشدارهای قرمز را حل کنید، سپس روی افزایش پس‌انداز و کاهش تعهدات تمرکز کنید.</p>

    <div class="installments-grid planning-card-grid planning-inline">
      <article v-for="item in financialHealthScore.items" :key="item.key" class="installment-item">
        <div class="installment-item-head">
          <div><strong>{{ item.title }}</strong><small>{{ item.message }}</small></div>
          <span>{{ toPersianNumber(item.score) }}</span>
        </div>
        <div class="progress" :class="{ danger: item.score < 50 }">
          <i :style="{ width: `${item.score}%` }" />
        </div>
        <p>{{ item.suggestion }}</p>
      </article>
    </div>

    <div v-if="financialHealthStrengths.length" class="insights planning-inline">
      <span v-for="item in financialHealthStrengths" :key="item">{{ item }}</span>
    </div>

    <div v-if="financialHealthWarnings.length" class="insights planning-warnings">
      <span v-for="item in financialHealthWarnings" :key="item">{{ item }}</span>
    </div>

    <div v-if="financialHealthSuggestions.length" class="weekly-category-budget glass-panel planning-inline">
      <div class="weekly-category-head"><strong>پیشنهادهای کوتاه</strong><small>برای بهتر شدن امتیاز</small></div>
      <div class="weekly-category-list">
        <span v-for="item in financialHealthSuggestions.slice(0, 6)" :key="item"><b>{{ item }}</b></span>
      </div>
    </div>
  </section>
</template>
