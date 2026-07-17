<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  debtForm,
  editingDebtId,
  selectedDebtStrategy,
  activeDebts,
  totalDebtRemaining,
  totalMinimumDebtPayments,
  totalExtraDebtPayments,
  selectedDebtPayoffPlan,
  recommendedDebtStrategy,
  debtFreedomDate,
  estimatedInterestSavings,
  debtPrincipalAmountInWords,
  debtRemainingAmountInWords,
  debtMinimumPaymentInWords,
  debtStartDatePickerValue,
  debtTargetPayoffDatePickerValue,
  formatMoneyInput,
  formatMoney,
  formatCompact,
  updateMoneyInput,
  addDebt,
  editDebt,
  deleteDebt,
  toggleDebt,
  recordDebtPayment,
  toPersianNumber,
  creditLimit,
  creditExpense,
  creditRemaining,
  updateCreditLimit,
} = budgetyar
</script>

<template>
  <section class="glass-panel settings-card">
    <div class="section-title">
      <div>
        <h2>بدهی‌ها</h2>
        <p>برنامه پرداخت حرفه‌ای با روش گلوله‌برفی یا بهمن</p>
      </div>
    </div>

    <div class="report-grid">
      <span><small>کل بدهی</small><strong>{{ formatMoney(totalDebtRemaining) }}</strong></span>
      <span><small>حداقل ماهانه</small><strong>{{ formatMoney(totalMinimumDebtPayments) }}</strong></span>
      <span><small>پرداخت اضافه</small><strong>{{ formatMoney(totalExtraDebtPayments) }}</strong></span>
      <span><small>آزادی تقریبی</small><strong>{{ debtFreedomDate }}</strong></span>
    </div>

    <div class="credit-settings-inline">
      <label>سقف اعتبار
        <input :value="formatMoneyInput(creditLimit)" type="text" inputmode="numeric" @input="updateCreditLimit" />
      </label>
      <span><small>مصرف اعتبار این ماه</small><strong>{{ formatMoney(creditExpense) }}</strong></span>
      <span><small>اعتبار باقی‌مانده</small><strong>{{ formatMoney(creditRemaining) }}</strong></span>
    </div>

    <form class="installment-form planning-form" @submit.prevent="addDebt">
      <div v-if="editingDebtId" class="installment-edit-banner"><strong>ویرایش بدهی</strong></div>
      <label><span>عنوان بدهی</span><input v-model="debtForm.title" required /></label>
      <label>
        <span>نوع بدهی</span>
        <select v-model="debtForm.type">
          <option value="loan">وام</option>
          <option value="credit">اعتبار</option>
          <option value="personal">شخصی</option>
          <option value="installment">قسطی</option>
          <option value="other">سایر</option>
        </select>
      </label>
      <label>
        <span>مبلغ اولیه</span>
        <input :value="formatMoneyInput(debtForm.principalAmount)" inputmode="numeric" @input="updateMoneyInput(debtForm, 'principalAmount', $event)" />
        <small v-if="debtPrincipalAmountInWords" class="amount-in-words">{{ debtPrincipalAmountInWords }}</small>
      </label>
      <label>
        <span>مانده فعلی</span>
        <input :value="formatMoneyInput(debtForm.remainingAmount)" inputmode="numeric" required @input="updateMoneyInput(debtForm, 'remainingAmount', $event)" />
        <small v-if="debtRemainingAmountInWords" class="amount-in-words">{{ debtRemainingAmountInWords }}</small>
      </label>
      <label><span>سود سالانه</span><input v-model.number="debtForm.interestRateAnnual" type="number" min="0" step="0.1" /></label>
      <label>
        <span>حداقل پرداخت</span>
        <input :value="formatMoneyInput(debtForm.minimumMonthlyPayment)" inputmode="numeric" @input="updateMoneyInput(debtForm, 'minimumMonthlyPayment', $event)" />
        <small v-if="debtMinimumPaymentInWords" class="amount-in-words">{{ debtMinimumPaymentInWords }}</small>
      </label>
      <label><span>پرداخت اضافه</span><input :value="formatMoneyInput(debtForm.extraMonthlyPayment)" inputmode="numeric" @input="updateMoneyInput(debtForm, 'extraMonthlyPayment', $event)" /></label>
      <label><span>روز سررسید</span><input v-model.number="debtForm.dueDay" type="number" min="1" max="31" /></label>
      <label><span>شروع</span><JalaliDatePicker v-model="debtStartDatePickerValue" class="date-picker-field" :clearable="false" popover-class="date-picker-popover" /></label>
      <label><span>هدف پایان</span><JalaliDatePicker v-model="debtTargetPayoffDatePickerValue" class="date-picker-field" placeholder="اختیاری" popover-class="date-picker-popover" /></label>
      <label><span>طلبکار</span><input v-model="debtForm.creditorName" /></label>
      <label>
        <span>اولویت</span>
        <select v-model="debtForm.priority"><option value="high">زیاد</option><option value="medium">متوسط</option><option value="low">کم</option></select>
      </label>
      <label class="check-row"><input v-model="debtForm.isActive" type="checkbox" /><span>فعال است</span></label>
      <label class="installment-description"><span>توضیح</span><textarea v-model="debtForm.note" rows="2" /></label>
      <button class="primary-button" type="submit">{{ editingDebtId ? 'ذخیره' : 'افزودن بدهی' }}</button>
    </form>

    <section class="weekly-category-budget glass-panel planning-inline">
      <div class="weekly-category-head">
        <strong>استراتژی پرداخت</strong>
        <small>پیشنهاد: {{ recommendedDebtStrategy === 'avalanche' ? 'بهمن' : 'گلوله‌برفی' }}</small>
      </div>
      <div class="segmented compact-toggle">
        <button type="button" :class="{ active: selectedDebtStrategy === 'snowball' }" @click="selectedDebtStrategy = 'snowball'">گلوله‌برفی</button>
        <button type="button" :class="{ active: selectedDebtStrategy === 'avalanche' }" @click="selectedDebtStrategy = 'avalanche'">بهمن</button>
      </div>
      <div class="cashflow-timeline">
        <span v-for="item in selectedDebtPayoffPlan.order" :key="item.debtId">
          <b>{{ toPersianNumber(item.order) }}. {{ item.title }}</b>
          <em>{{ toPersianNumber(item.monthsToPayoff) }} ماه · سود {{ formatCompact(item.totalInterest) }}</em>
          <strong>{{ formatCompact(item.totalPaid) }}</strong>
        </span>
      </div>
      <p class="empty-inline">صرفه‌جویی روش بهمن نسبت به گلوله‌برفی: {{ formatMoney(estimatedInterestSavings) }}</p>
    </section>

    <div v-if="activeDebts.length" class="installments-grid planning-card-grid">
      <article v-for="debt in activeDebts" :key="debt.id" class="installment-item">
        <div class="installment-item-head">
          <div><strong>{{ debt.title }}</strong><small>{{ debt.creditorName || 'بدون طلبکار' }} · روز {{ toPersianNumber(debt.dueDay || 0) }}</small></div>
          <span>{{ debt.interestRateAnnual || 0 }}٪</span>
        </div>
        <div class="installment-meta">
          <span>مانده: {{ formatMoney(debt.remainingAmount) }}</span>
          <span>حداقل: {{ formatMoney(debt.minimumMonthlyPayment) }}</span>
          <span>اضافه: {{ formatMoney(debt.extraMonthlyPayment || 0) }}</span>
        </div>
        <p v-if="debt.note">{{ debt.note }}</p>
        <div class="installment-actions">
          <button class="primary-button" type="button" @click="recordDebtPayment(debt)">پرداخت</button>
          <button class="soft-button" type="button" @click="editDebt(debt)">ویرایش</button>
          <button class="soft-button" type="button" @click="toggleDebt(debt.id)">غیرفعال</button>
          <button class="soft-button" type="button" @click="deleteDebt(debt.id)">حذف</button>
        </div>
      </article>
    </div>
    <EmptyState v-else compact title="هنوز بدهی ثبت نشده است." text="برای برنامه پرداخت، اولین بدهی را اضافه کن." />
  </section>
</template>
