<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
const budgetyar = useBudgetyar()
const {
  goalForm,
  editingGoalId,
  goalTargetAmountInWords,
  goalSavedAmountInWords,
  formatGoalAmount,
  getGoalUnitLabel,
  getGoalTransactionTypeLabel,
  getGoalEstimatedValue,
  getGoalTrackingModeLabel,
  getGoalHealthLabel,
  getGoalScenario,
  getGoalSummary,
  getGoalTransactions,
  getGoalTargetValue,
  goalTargetDatePickerValue,
  activeGoals,
  archivedGoals,
  categories,
  totalGoalsTarget,
  totalGoalsSaved,
  totalGoalsRemaining,
  formatMoneyInput,
  parseMoneyInput,
  formatMoney,
  formatCompact,
  updateMoneyInput,
  addGoal,
  editGoal,
  archiveGoal,
  pauseGoal,
  resumeGoal,
  deleteGoal,
  addGoalContribution,
  withdrawFromGoal,
  getGoalProgress,
  getGoalRemainingAmount,
  getGoalSuggestedMonthlySaving,
  getGoalSuggestedWeeklySaving,
  getCategory,
  marketRates,
  marketRatesLoading,
  marketRatesError,
  refreshMarketRates,
} = budgetyar

const goalTransferAmounts = reactive<Record<string, string>>({})

function updateGoalTransferAmount(goalId: string, event: Event) {
  const input = event.target as HTMLInputElement
  const amount = parseMoneyInput(input.value)
  goalTransferAmounts[goalId] = formatMoneyInput(amount)
  input.value = goalTransferAmounts[goalId]
}

function submitGoalTransfer(goal: Parameters<typeof addGoalContribution>[0], type: 'deposit' | 'withdraw') {
  const amount = parseMoneyInput(goalTransferAmounts[goal.id] ?? '')
  if (!amount) return

  if (type === 'deposit') {
    addGoalContribution(goal, amount)
  } else {
    withdrawFromGoal(goal, amount)
  }

  goalTransferAmounts[goal.id] = ''
}

onMounted(() => {
  if (!marketRates.value) refreshMarketRates()
})
</script>

<template>
  <section class="glass-panel settings-card">
    <div class="section-title">
      <div>
        <h2>هدف‌های مالی</h2>
        <p>پس‌انداز، پاکت‌ها و مسیر رسیدن به هدف</p>
      </div>
    </div>

    <section class="market-rates-card planning-inline">
      <div>
        <strong>قیمت روز بازار</strong>
        <small>برای برآورد ارزش هدف‌های طلا، نقره و دلار</small>
      </div>
      <div v-if="marketRates" class="market-rates-list">
        <span>دلار <b>{{ formatMoney(marketRates.usd) }}</b></span>
        <span>طلای ۱۸ <b>{{ formatMoney(marketRates.gold18) }}</b></span>
      </div>
      <button class="soft-button" type="button" :disabled="marketRatesLoading" @click="refreshMarketRates">
        <RefreshCw :size="16" :class="{ spinning: marketRatesLoading }" aria-hidden="true" />
        <span>{{ marketRatesLoading ? 'در حال دریافت…' : 'به‌روزرسانی قیمت‌ها' }}</span>
      </button>
      <small v-if="marketRatesError" class="market-rates-error">{{ marketRatesError }}</small>
    </section>

    <div class="report-grid">
      <span><small>هدف کل</small><strong>{{ formatMoney(totalGoalsTarget) }}</strong></span>
      <span><small>پس‌انداز شده</small><strong>{{ formatMoney(totalGoalsSaved) }}</strong></span>
      <span><small>مانده هدف‌ها</small><strong>{{ formatMoney(totalGoalsRemaining) }}</strong></span>
      <span><small>هدف فعال</small><strong>{{ activeGoals.length }}</strong></span>
    </div>

    <form class="installment-form planning-form" @submit.prevent="addGoal">
      <div v-if="editingGoalId" class="installment-edit-banner">
        <strong>ویرایش هدف</strong>
      </div>
      <label>
        <span>واحد هدف</span>
        <BudgetyarSelect v-model="goalForm.unit">
          <option value="irr">تومان</option>
          <option value="goldGram">گرم طلا</option>
          <option value="silverGram">گرم نقره</option>
          <option value="usd">دلار</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>روش رهگیری</span>
        <BudgetyarSelect v-model="goalForm.trackingMode">
          <option value="FIXED_MONEY">پول ثابت</option>
          <option value="ASSET_FUNDING">تامین دارایی</option>
          <option value="ASSET_HOLDING">دارایی در اختیار</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>عنوان هدف</span>
        <input v-model="goalForm.title" type="text" placeholder="مثلا صندوق اضطراری" required />
      </label>
      <label>
        <span>{{ goalForm.trackingMode === 'ASSET_HOLDING' ? 'مقدار هدف' : 'مبلغ هدف' }}</span>
        <input :value="formatMoneyInput(goalForm.targetAmount)" inputmode="numeric" required @input="updateMoneyInput(goalForm, 'targetAmount', $event)" />
        <small v-if="goalTargetAmountInWords" class="amount-in-words">{{ goalTargetAmountInWords }}</small>
      </label>
      <label>
        <span>{{ goalForm.trackingMode === 'ASSET_HOLDING' ? 'مقدار فعلی' : 'پس‌انداز فعلی' }}</span>
        <input :value="formatMoneyInput(goalForm.savedAmount)" inputmode="numeric" @input="updateMoneyInput(goalForm, 'savedAmount', $event)" />
        <small v-if="goalSavedAmountInWords" class="amount-in-words">{{ goalSavedAmountInWords }}</small>
      </label>
      <label v-if="goalForm.trackingMode !== 'FIXED_MONEY'">
        <span>مقدار دارایی</span>
        <input v-model.number="goalForm.targetQuantity" type="number" min="0" step="0.01" />
      </label>
      <label v-if="goalForm.trackingMode !== 'FIXED_MONEY'">
        <span>کد دارایی</span>
        <BudgetyarSelect v-model="goalForm.assetCode">
          <option value="">خودکار از واحد</option>
          <option value="gold18">طلا ۱۸ عیار</option>
          <option value="usd">دلار</option>
          <option value="silver">نقره</option>
        </BudgetyarSelect>
      </label>
      <label v-if="goalForm.trackingMode !== 'FIXED_MONEY'">
        <span>سیاست ارزش</span>
        <BudgetyarSelect v-model="goalForm.targetValuePolicy">
          <option value="NOMINAL">اسمی</option>
          <option value="INFLATION_INDEXED">شاخص تورم</option>
          <option value="MARKET_LINKED">وابسته به بازار</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>واریز برنامه‌ای</span>
        <input v-model.number="goalForm.plannedContribution" type="number" min="0" inputmode="numeric" />
      </label>
      <label>
        <span>تاریخ هدف</span>
        <JalaliDatePicker v-model="goalTargetDatePickerValue" class="date-picker-field" placeholder="اختیاری" popover-class="date-picker-popover" />
      </label>
      <label>
        <span>دسته</span>
        <BudgetyarSelect v-model="goalForm.categoryId">
          <option value="">بدون دسته</option>
          <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>اولویت</span>
        <BudgetyarSelect v-model="goalForm.priority">
          <option value="high">زیاد</option>
          <option value="medium">متوسط</option>
          <option value="low">کم</option>
        </BudgetyarSelect>
      </label>
      <label>
        <span>آیکن</span>
        <input v-model="goalForm.icon" maxlength="3" />
      </label>
      <label>
        <span>رنگ</span>
        <input v-model="goalForm.color" type="color" />
      </label>
      <label>
        <span>تعهد</span>
        <BudgetyarSelect v-model="goalForm.commitmentMode">
          <option value="NONE">بدون تعهد</option>
          <option value="SOFT_WARNING">هشدار نرم</option>
          <option value="REQUIRE_REASON">نیاز به دلیل</option>
          <option value="COOLING_OFF">دوره انتظار</option>
        </BudgetyarSelect>
      </label>
      <label class="installment-description">
        <span>توضیح</span>
        <textarea v-model="goalForm.note" rows="2" placeholder="اختیاری" />
      </label>
      <button class="primary-button" type="submit">{{ editingGoalId ? 'ذخیره هدف' : 'افزودن هدف' }}</button>
    </form>

    <div v-if="activeGoals.length" class="installments-grid planning-card-grid">
      <article v-for="goal in activeGoals" :key="goal.id" class="installment-item goal-item" :style="{ '--goal-accent': goal.color }">
        <div class="installment-item-head">
          <div>
            <strong>{{ goal.icon }} {{ goal.title }}</strong>
            <small>{{ goal.categoryId ? getCategory(goal.categoryId).label : 'بدون دسته' }} · {{ goal.targetDate || 'بدون تاریخ' }}</small>
          </div>
          <span>{{ goal.priority === 'high' ? 'زیاد' : goal.priority === 'low' ? 'کم' : 'متوسط' }}</span>
        </div>
        <div class="progress">
          <i :style="{ width: `${getGoalProgress(goal)}%`, background: goal.color }" />
        </div>
        <div class="installment-meta">
          <span class="goal-unit-summary">
            {{ goal.trackingMode === 'ASSET_FUNDING'
              ? `تامین ${formatMoney(getGoalTargetValue(goal))} برای خرید ${formatGoalAmount(goal.targetQuantity || goal.targetAmount, goal.unit)}`
              : goal.trackingMode === 'ASSET_HOLDING'
                ? `دارایی: ${formatGoalAmount(goal.targetQuantity || goal.targetAmount, goal.unit)} · موجودی ${formatGoalAmount(getGoalSummary(goal).currentQuantity, goal.unit)}`
                : `واحد: ${getGoalUnitLabel(goal.unit)} · هدف ${formatGoalAmount(goal.targetAmount, goal.unit)} · ذخیره ${formatGoalAmount(goal.savedAmount, goal.unit)}`
            }}
          </span>
          <span>نوع رهگیری: {{ getGoalTrackingModeLabel(goal) }}</span>
          <span>سلامت: {{ getGoalHealthLabel(goal) }}</span>
          <span v-if="getGoalEstimatedValue(goal) !== null">ارزش تقریبی فعلی: {{ formatMoney(getGoalEstimatedValue(goal) || 0) }} تومان</span>
          <span v-if="getGoalEstimatedValue(goal, goal.targetAmount) !== null">ارزش تقریبی هدف: {{ formatMoney(getGoalEstimatedValue(goal, goal.targetAmount) || 0) }} تومان</span>
          <span>
            {{ goal.trackingMode === 'ASSET_HOLDING'
              ? `${formatGoalAmount(getGoalSummary(goal).currentQuantity, goal.unit)} از ${formatGoalAmount(getGoalSummary(goal).currentRequiredAmount ?? goal.targetAmount, goal.unit)}`
              : `${formatMoney(getGoalSummary(goal).netSavedAmount)} از ${formatMoney(getGoalSummary(goal).currentRequiredAmount ?? goal.targetAmount)}`
            }}
          </span>
          <span>مانده: {{ formatMoney(getGoalRemainingAmount(goal)) }}</span>
          <span>ماهیانه پیشنهادی: {{ formatCompact(getGoalSuggestedMonthlySaving(goal)) }}</span>
          <span>هفتگی پیشنهادی: {{ formatCompact(getGoalSuggestedWeeklySaving(goal)) }}</span>
          <span v-if="getGoalSummary(goal).currentMarketPrice">قیمت واحد: {{ formatMoney(getGoalSummary(goal).currentMarketPrice || 0) }}</span>
          <span v-if="getGoalSummary(goal).currentQuantity">موجودی فعلی: {{ formatGoalAmount(getGoalSummary(goal).currentQuantity, goal.unit) }}</span>
        </div>
        <p v-if="goal.note">{{ goal.note }}</p>
        <div class="goal-transfer-box">
          <label>
            <span>مبلغ واریز یا برداشت</span>
            <input
              :value="goalTransferAmounts[goal.id] || ''"
              inputmode="numeric"
              :placeholder="getGoalUnitLabel(goal.unit)"
              @input="updateGoalTransferAmount(goal.id, $event)"
            />
          </label>
          <div class="goal-transfer-actions">
            <button class="primary-button" type="button" :disabled="!parseMoneyInput(goalTransferAmounts[goal.id] || '')" @click="submitGoalTransfer(goal, 'deposit')">واریز</button>
            <button class="soft-button" type="button" :disabled="!parseMoneyInput(goalTransferAmounts[goal.id] || '')" @click="submitGoalTransfer(goal, 'withdraw')">برداشت</button>
          </div>
        </div>
        <details class="planning-details goal-scenario-details">
          <summary>سناریو و دفتر</summary>
          <div class="mobile-category-list goal-scenario-list">
            <span>
              <b>وضعیت فعلی</b>
              <em>{{ getGoalScenario(goal).baseline.paceLevel === 'ahead' ? 'جلوتر' : getGoalScenario(goal).baseline.paceLevel === 'behind' ? 'عقب' : getGoalScenario(goal).baseline.paceLevel === 'overfunded' ? 'بیش‌از‌هدف' : 'هم‌مسیر' }} · {{ goal.trackingMode === 'ASSET_HOLDING' ? formatGoalAmount(getGoalScenario(goal).baseline.monthlyNeeded, goal.unit) : formatMoney(getGoalScenario(goal).baseline.monthlyNeeded) }} ماهانه</em>
            </span>
            <span>
              <b>شتاب بیشتر</b>
              <em>{{ getGoalScenario(goal).accelerated.estimatedCompletionDate || 'نامشخص' }}</em>
            </span>
            <span>
              <b>وقفه</b>
              <em>{{ getGoalScenario(goal).paused.estimatedCompletionDate || 'نامشخص' }}</em>
            </span>
          </div>
          <div v-if="getGoalTransactions(goal.id).length" class="goal-ledger-list">
            <span v-for="tx in getGoalTransactions(goal.id)" :key="tx.id">
              <b>{{ getGoalTransactionTypeLabel(tx.type) }}</b>
              <em>{{ formatMoney(tx.baseAmount) }} · {{ tx.occurredAt }}</em>
            </span>
          </div>
        </details>
        <div class="installment-actions">
          <button class="soft-button" type="button" @click="editGoal(goal)">ویرایش</button>
          <button v-if="goal.status === 'paused'" class="soft-button" type="button" @click="resumeGoal(goal.id)">ادامه</button>
          <button v-else-if="goal.status !== 'completed'" class="soft-button" type="button" @click="pauseGoal(goal.id)">توقف</button>
          <button class="soft-button" type="button" @click="archiveGoal(goal.id)">بایگانی</button>
          <button class="soft-button" type="button" @click="deleteGoal(goal.id)">حذف</button>
        </div>
      </article>
    </div>

    <EmptyState v-else compact title="هنوز هدفی ثبت نشده است." text="یک هدف کوچک اضافه کن تا مسیر پس‌انداز روشن شود." />

    <details v-if="archivedGoals.length" class="planning-details">
      <summary>هدف‌های بایگانی‌شده</summary>
      <div class="mobile-category-list">
        <span v-for="goal in archivedGoals" :key="goal.id">
          <b>{{ goal.icon }} {{ goal.title }}</b>
          <em>{{ formatCompact(goal.savedAmount) }}</em>
        </span>
      </div>
    </details>
  </section>
</template>
