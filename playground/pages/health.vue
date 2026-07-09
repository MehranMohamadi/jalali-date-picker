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
} = budgetyar
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
      <p>{{ financialHealthSuggestions[0] || 'وضعیت کلی قابل مدیریت است.' }}</p>
    </article>

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
