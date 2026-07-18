<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  incomeSettings,
  averageMonthlyIncome,
  lowestRecentMonthlyIncome,
  highestRecentMonthlyIncome,
  incomeVolatilityPercent,
  recommendedBudgetBase,
  recommendedEssentialBudget,
  recommendedSavingBudget,
  recommendedFlexibleBudget,
  badMonthReserveSuggestion,
  irregularIncomeWarnings,
  formatMoneyInput,
  formatMoney,
  updateIncomeSettings,
  applyRecommendedBudgetPlan,
} = budgetyar

function updateNumberSetting(key: string, event: Event) {
  updateIncomeSettings({ [key]: Number((event.target as HTMLInputElement).value) || 0 })
}

function updateMoneySetting(key: string, event: Event) {
  const value = Number(String((event.target as HTMLInputElement).value).replace(/[^\d]/g, '')) || 0
  updateIncomeSettings({ [key]: value })
}
</script>

<template>
  <section class="glass-panel settings-card">
    <div class="section-title">
      <div>
        <h2>برنامه درآمد نامنظم</h2>
        <p>بودجه امن برای درآمد متغیر و ماه‌های ضعیف</p>
      </div>
    </div>

    <div class="report-grid">
      <span><small>میانگین درآمد</small><strong>{{ formatMoney(averageMonthlyIncome) }}</strong></span>
      <span><small>کمترین درآمد</small><strong>{{ formatMoney(lowestRecentMonthlyIncome) }}</strong></span>
      <span><small>بیشترین درآمد</small><strong>{{ formatMoney(highestRecentMonthlyIncome) }}</strong></span>
      <span><small>نوسان درآمد</small><strong>{{ incomeVolatilityPercent }}٪</strong></span>
    </div>

    <form class="installment-form planning-form" @submit.prevent>
      <label>
        <span>روش بودجه‌بندی</span>
        <BudgetyarSelect :value="incomeSettings.mode" @change="updateIncomeSettings({ mode: ($event.target as HTMLSelectElement).value as any })">
          <option value="fixed">ثابت</option>
          <option value="average">میانگین</option>
          <option value="conservative">محافظه‌کارانه</option>
          <option value="manual">دستی</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>ماه‌های بررسی</span>
        <BudgetyarSelect :value="incomeSettings.historyMonths" @change="updateIncomeSettings({ historyMonths: Number(($event.target as HTMLSelectElement).value) as 3 | 6 | 12 })">
          <option :value="3">۳</option>
          <option :value="6">۶</option>
          <option :value="12">۱۲</option>
        </BudgetyarSelect>
      </label>
      <label><span>درآمد ثابت</span><input :value="formatMoneyInput(incomeSettings.fixedMonthlyIncome || 0)" inputmode="numeric" @input="updateMoneySetting('fixedMonthlyIncome', $event)" /></label>
      <label><span>بودجه دستی</span><input :value="formatMoneyInput(incomeSettings.manualBudgetBase || 0)" inputmode="numeric" @input="updateMoneySetting('manualBudgetBase', $event)" /></label>
      <label><span>ضریب احتیاط</span><input :value="incomeSettings.safetyBufferPercent" type="number" min="0" max="80" @input="updateNumberSetting('safetyBufferPercent', $event)" /></label>
      <label><span>صندوق ماه ضعیف</span><input :value="incomeSettings.badMonthReservePercent" type="number" min="0" max="80" @input="updateNumberSetting('badMonthReservePercent', $event)" /></label>
      <label><span>درصد ضروری</span><input :value="incomeSettings.essentialPercent" type="number" min="0" max="100" @input="updateNumberSetting('essentialPercent', $event)" /></label>
      <label><span>درصد پس‌انداز</span><input :value="incomeSettings.savingPercent" type="number" min="0" max="100" @input="updateNumberSetting('savingPercent', $event)" /></label>
      <label><span>درصد منعطف</span><input :value="incomeSettings.flexiblePercent" type="number" min="0" max="100" @input="updateNumberSetting('flexiblePercent', $event)" /></label>
    </form>

    <div class="report-grid planning-inline">
      <span><small>بودجه امن پیشنهادی</small><strong>{{ formatMoney(recommendedBudgetBase) }}</strong></span>
      <span><small>ضروری</small><strong>{{ formatMoney(recommendedEssentialBudget) }}</strong></span>
      <span><small>پس‌انداز</small><strong>{{ formatMoney(recommendedSavingBudget) }}</strong></span>
      <span><small>منعطف</small><strong>{{ formatMoney(recommendedFlexibleBudget) }}</strong></span>
      <span><small>صندوق ماه ضعیف</small><strong>{{ formatMoney(badMonthReserveSuggestion) }}</strong></span>
    </div>

    <div v-if="irregularIncomeWarnings.length" class="insights planning-warnings">
      <span v-for="warning in irregularIncomeWarnings" :key="warning">{{ warning }}</span>
    </div>

    <button class="primary-button full planning-inline" type="button" @click="applyRecommendedBudgetPlan">اعمال پیشنهاد روی بودجه‌ها</button>
  </section>
</template>
