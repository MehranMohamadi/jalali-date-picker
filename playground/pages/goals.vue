<script setup lang="ts">
const { amountsHidden, privateText } = usePrivacy()
import { RefreshCw } from 'lucide-vue-next'
import { toPersianDigits } from '../../src/utils/digits'
const budgetyar = useBudgetyar()
const {
  goalForm,
  editingGoalId,
  goalTargetAmountInWords,
  goalSavedAmountInWords,
  formatGoalAmount,
  formatGoalTrackedAmount,
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
  formatCompact,
  formatMoneyInput,
  parseMoneyInput,
  formatMoney,
  updateMoneyInput,
  addGoal,
  editGoal,
  archiveGoal,
  pauseGoal,
  resumeGoal,
  deleteGoal,
  addGoalContribution,
  withdrawFromGoal,
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
const goalEditor = ref<HTMLDetailsElement | null>(null)
function formatGoalMetric(value: number) {
  return formatCompact(value).replace(' میلیون تومان', ' م').replace(' هزار تومان', ' ه').replace(' تومان', '')
}
function formatGoalPreview(goal: Parameters<typeof formatGoalTrackedAmount>[0], amount: number) {
  return goal.trackingMode === 'ASSET_FUNDING' || (goal.unit ?? 'irr') === 'irr'
    ? formatCompact(amount)
    : formatGoalTrackedAmount(goal, amount, true)
}
const goalCards = computed(() => activeGoals.value.map((goal) => {
  const snapshot = getGoalSummary(goal)
  return {
    goal,
    snapshot,
    saved: snapshot.mode === 'ASSET_HOLDING' ? snapshot.currentQuantity : snapshot.netSavedAmount,
    target: snapshot.mode === 'ASSET_HOLDING' ? goal.targetQuantity ?? goal.targetAmount : snapshot.currentRequiredAmount ?? goal.targetAmount,
  }
}))

async function openGoalEditor(goal: Parameters<typeof editGoal>[0]) {
  editGoal(goal)
  if (goalEditor.value) goalEditor.value.open = true
  await nextTick()
  goalEditor.value?.querySelector<HTMLInputElement>('input[type="text"]')?.focus({ preventScroll: true })
}

function saveGoal() {
  addGoal()
  // A successful save resets the existing form; invalid input stays open.
  if (!goalForm.title && goalEditor.value) goalEditor.value.open = false
}

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
  <section class="goals-page" aria-label="‏هدف‌های مالی">
    <div class="goals-metrics">
      <div><small>‏هدف کل</small><strong>{{ formatGoalMetric(totalGoalsTarget) }}</strong></div>
      <div><small>‏پس‌انداز</small><strong>{{ formatGoalMetric(totalGoalsSaved) }}</strong></div>
      <div><small>‏فعال</small><strong>{{ toPersianDigits(activeGoals.length) }}</strong></div>
    </div>

    <section class="glass-panel goals-market-card">
      <div>
        <h2>‏قیمت روز بازار</h2>
        <p>‏برای هدف‌های طلا، نقره و دلار</p>
      </div>
      <p v-if="marketRatesError || (!marketRates && !marketRatesLoading)" class="goals-market-notice" role="status">‏قیمت دریافت نشد؛ برآورد ارزش دارایی‌ها ممکن است در دسترس نباشد.</p>
      <small v-if="marketRates" class="goals-market-caption">‏آخرین نرخ ذخیره‌شده، برای برآورد ارزش دارایی‌ها.</small>
      <div v-if="marketRates" class="market-rates-list">
        <span>دلار <b>{{ formatMoney(marketRates.usd) }}</b></span>
        <span>طلای ۱۸ <b>{{ formatMoney(marketRates.gold18) }}</b></span>
      </div>
      <button class="soft-button" type="button" :disabled="marketRatesLoading" @click="refreshMarketRates">
        <RefreshCw :size="16" :class="{ spinning: marketRatesLoading }" aria-hidden="true" />
        <span>{{ marketRatesLoading ? '‏در حال دریافت…' : '‏به‌روزرسانی قیمت‌ها' }}</span>
      </button>
    </section>

    <details ref="goalEditor" class="goals-editor">
      <summary class="primary-button">{{ editingGoalId ? '‏ویرایش هدف' : '‏افزودن هدف' }}</summary>
    <form class="installment-form planning-form goals-form" @submit.prevent="saveGoal">
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
        <span>{{ goalForm.trackingMode === 'ASSET_FUNDING' || goalForm.unit === 'irr' ? 'مبلغ هدف' : 'مقدار هدف' }}</span>
        <input :disabled="amountsHidden" :value="amountsHidden ? '••••' : formatMoneyInput(goalForm.targetAmount)" inputmode="numeric" required @input="updateMoneyInput(goalForm, 'targetAmount', $event)" />
        <small v-if="goalTargetAmountInWords" class="amount-in-words">{{ privateText(goalTargetAmountInWords) }}</small>
      </label>
      <label>
        <span>{{ goalForm.trackingMode === 'ASSET_FUNDING' || goalForm.unit === 'irr' ? 'پس‌انداز فعلی' : 'مقدار فعلی' }}</span>
        <input :disabled="amountsHidden" :value="amountsHidden ? '••••' : formatMoneyInput(goalForm.savedAmount)" inputmode="numeric" @input="updateMoneyInput(goalForm, 'savedAmount', $event)" />
        <small v-if="goalSavedAmountInWords" class="amount-in-words">{{ privateText(goalSavedAmountInWords) }}</small>
      </label>
      <label v-if="goalForm.trackingMode !== 'FIXED_MONEY'">
        <span>مقدار دارایی ({{ getGoalUnitLabel(goalForm.unit) }})</span>
        <input v-if="!amountsHidden" v-model.number="goalForm.targetQuantity" type="number" min="0" step="0.01" />
        <input v-else value="••••" disabled aria-label="‏مقدار پنهان است" />
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
        <span>{{ goalForm.trackingMode === 'ASSET_FUNDING' || goalForm.unit === 'irr' ? 'واریز برنامه‌ای' : `افزایش برنامه‌ای (${getGoalUnitLabel(goalForm.unit)})` }}</span>
        <input v-if="!amountsHidden" v-model.number="goalForm.plannedContribution" type="number" min="0" inputmode="numeric" />
        <input v-else value="••••" disabled aria-label="‏مبلغ پنهان است" />
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
    </details>

    <div v-if="activeGoals.length" class="goals-card-list">
      <details v-for="({ goal, snapshot, saved, target }, index) in goalCards" :key="goal.id" class="glass-panel goal-card" :open="index === 0">
        <summary class="goal-card-summary">
          <h2>{{ goal.title }}</h2>
          <span class="goal-completion">{{ privateText(`${toPersianDigits(Math.round(snapshot.progressPercent))}٪ تکمیل شده`) }}</span>
          <small>{{ formatGoalPreview(goal, saved) }} ‏از {{ formatGoalPreview(goal, target) }}</small>
          <div class="goal-progress" role="progressbar" :aria-label="goal.title" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="amountsHidden ? undefined : Math.min(100, Math.max(0, snapshot.progressPercent))" :aria-valuetext="amountsHidden ? '‏پنهان' : `${toPersianDigits(Math.round(snapshot.progressPercent))}٪`">
            <i :style="{ width: amountsHidden ? '0%' : `${Math.min(100, Math.max(0, snapshot.progressPercent))}%` }" />
          </div>
          <span class="goal-collapsed-actions">{{ goal.status === 'paused' ? '‏ادامه، بایگانی و ویرایش' : '‏توقف، بایگانی و ویرایش' }}</span>
        </summary>
        <div class="goal-card-body">
          <p class="goal-next-step">‏مانده: {{ formatGoalPreview(goal, getGoalRemainingAmount(goal)) }}<template v-if="goal.targetDate"> · {{ toPersianDigits(goal.targetDate) }}</template></p>
          <p class="goal-monthly-saving">‏ماهیانه پیشنهادی: {{ formatGoalPreview(goal, getGoalSuggestedMonthlySaving(goal)) }}</p>
        <details class="goal-financial-details">
          <summary>‏جزئیات هدف</summary>
          <small>{{ goal.categoryId ? getCategory(goal.categoryId).label : '‏بدون دسته' }} · {{ goal.priority === 'high' ? '‏اولویت زیاد' : goal.priority === 'low' ? '‏اولویت کم' : '‏اولویت متوسط' }}</small>
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
          <span v-if="getGoalEstimatedValue(goal) !== null">ارزش تقریبی فعلی: {{ formatMoney(getGoalEstimatedValue(goal) || 0) }}</span>
          <span v-if="getGoalEstimatedValue(goal, goal.targetAmount) !== null">ارزش تقریبی هدف: {{ formatMoney(getGoalEstimatedValue(goal, goal.targetAmount) || 0) }}</span>
          <span>
            {{ goal.trackingMode === 'ASSET_HOLDING'
              ? `${formatGoalAmount(getGoalSummary(goal).currentQuantity, goal.unit)} از ${formatGoalAmount(getGoalSummary(goal).currentRequiredAmount ?? goal.targetAmount, goal.unit)}`
              : `${formatGoalTrackedAmount(goal, getGoalSummary(goal).netSavedAmount)} از ${formatGoalTrackedAmount(goal, getGoalSummary(goal).currentRequiredAmount ?? goal.targetAmount)}`
            }}
          </span>
          <span>مانده: {{ formatGoalTrackedAmount(goal, getGoalRemainingAmount(goal)) }}</span>
          <span>ماهیانه پیشنهادی: {{ formatGoalTrackedAmount(goal, getGoalSuggestedMonthlySaving(goal), true) }}</span>
          <span>هفتگی پیشنهادی: {{ formatGoalTrackedAmount(goal, getGoalSuggestedWeeklySaving(goal), true) }}</span>
          <span v-if="getGoalSummary(goal).currentMarketPrice">قیمت واحد: {{ formatMoney(getGoalSummary(goal).currentMarketPrice || 0) }}</span>
          <span v-if="getGoalSummary(goal).currentQuantity">موجودی فعلی: {{ formatGoalAmount(getGoalSummary(goal).currentQuantity, goal.unit) }}</span>
        </div>
        <p v-if="goal.note">{{ goal.note }}</p>
        </details>
        <div class="goal-transfer-box">
          <label>
            <span>{{ goal.trackingMode === 'ASSET_FUNDING' || goal.unit === 'irr' ? 'مبلغ واریز یا برداشت' : `مقدار افزایش یا کاهش (${getGoalUnitLabel(goal.unit)})` }}</span>
            <input :disabled="amountsHidden"
              :value="amountsHidden ? '••••' : goalTransferAmounts[goal.id] || ''"
              inputmode="numeric"
              :placeholder="getGoalUnitLabel(goal.unit)"
              @input="updateGoalTransferAmount(goal.id, $event)"
            />
          </label>
          <div class="goal-transfer-actions">
            <button class="primary-button" type="button" :disabled="amountsHidden || !parseMoneyInput(goalTransferAmounts[goal.id] || '')" @click="submitGoalTransfer(goal, 'deposit')">واریز</button>
            <button class="soft-button" type="button" :disabled="amountsHidden || !parseMoneyInput(goalTransferAmounts[goal.id] || '')" @click="submitGoalTransfer(goal, 'withdraw')">برداشت</button>
          </div>
        </div>
        <details class="planning-details goal-scenario-details">
          <summary>سناریو و دفتر</summary>
          <div class="mobile-category-list goal-scenario-list">
            <span>
              <b>وضعیت فعلی</b>
              <em>{{ getGoalScenario(goal).baseline.paceLevel === 'ahead' ? 'جلوتر' : getGoalScenario(goal).baseline.paceLevel === 'behind' ? 'عقب' : getGoalScenario(goal).baseline.paceLevel === 'overfunded' ? 'بیش‌از‌هدف' : 'هم‌مسیر' }} · {{ formatGoalTrackedAmount(goal, getGoalScenario(goal).baseline.monthlyNeeded) }} ماهانه</em>
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
              <em>{{ formatGoalTrackedAmount(goal, tx.quantity || tx.baseAmount) }} · {{ tx.occurredAt }}</em>
            </span>
          </div>
        </details>
        <button class="soft-button goal-edit-button" type="button" @click="openGoalEditor(goal)">‏ویرایش هدف</button>
        <details class="goal-management">
          <summary>‏توقف، بایگانی و حذف</summary>
        <div class="installment-actions">
          <button class="soft-button" type="button" @click="openGoalEditor(goal)">‏ویرایش</button>
          <button v-if="goal.status === 'paused'" class="soft-button" type="button" @click="resumeGoal(goal.id)">ادامه</button>
          <button v-else-if="goal.status !== 'completed'" class="soft-button" type="button" @click="pauseGoal(goal.id)">توقف</button>
          <button class="soft-button" type="button" @click="archiveGoal(goal.id)">بایگانی</button>
          <button class="soft-button" type="button" @click="deleteGoal(goal.id)">حذف</button>
        </div>
        </details>
        </div>
      </details>
    </div>

    <EmptyState v-else compact title="هنوز هدفی ثبت نشده است." text="یک هدف کوچک اضافه کن تا مسیر پس‌انداز روشن شود." />

    <details v-if="archivedGoals.length" class="planning-details">
      <summary>هدف‌های بایگانی‌شده</summary>
      <div class="mobile-category-list">
        <span v-for="goal in archivedGoals" :key="goal.id">
          <b>{{ goal.icon }} {{ goal.title }}</b>
          <em>{{ formatGoalTrackedAmount(goal, goal.savedAmount, true) }}</em>
        </span>
      </div>
    </details>
  </section>
</template>

<style scoped>
.goals-page { display: grid; gap: 12px; min-width: 0; }
.goals-metrics { display: grid; gap: 8px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.goals-metrics > div { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; display: grid; gap: 10px; min-width: 0; padding: 12px; }
.goals-metrics small { color: var(--muted); font-size: .6875rem; }
.goals-metrics strong { color: var(--text); font-size: 1.05rem; font-weight: 600; overflow-wrap: anywhere; }
.goals-page .goals-market-card { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; display: grid; gap: 10px; padding: 14px; }
.goals-market-card h2, .goal-card h2 { color: var(--text); font-size: .9rem; font-weight: 600; margin: 0; }
.goals-market-card p { color: var(--muted); font-size: .6875rem; line-height: 1.8; margin: 8px 0 0; }
.goals-market-card .goals-market-notice { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 14px; color: var(--warning); font-size: .6875rem; margin: 0; padding: 12px; }
.goals-market-caption { color: var(--muted); font-size: .625rem; }
.goals-market-card .market-rates-list { display: flex; flex-wrap: wrap; font-size: .75rem; gap: 10px; }
.goals-market-card > button { justify-content: center; min-height: 42px; width: 100%; }
.goals-editor > summary { cursor: pointer; display: flex; justify-content: center; list-style: none; min-height: 44px; width: 100%; }
.goals-editor > summary::-webkit-details-marker, .goal-card-summary::-webkit-details-marker { display: none; }
.goals-form { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; margin-top: 12px; padding: 14px; }
.goals-form > label { min-width: 0; }
.goals-form input:not([type='color']), .goals-form textarea, .goals-form :deep(.budgetyar-select-trigger) { background: var(--bg-2); border-color: var(--line-strong); color: var(--text); }
.goals-page :deep(.budgetyar-select-menu) { background: var(--panel-strong); border-color: var(--line-strong); }
.goals-page :deep(.budgetyar-select-option.selected) { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.goals-card-list { align-items: start; display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.goals-page .goal-card { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; min-width: 0; }
.goal-card-summary { cursor: pointer; display: grid; gap: 12px; list-style: none; padding: 14px; }
.goal-completion { color: var(--muted-2); font-size: .75rem; }
.goal-card-summary > small { color: var(--muted); font-size: .6875rem; line-height: 1.8; overflow-wrap: anywhere; }
.goal-progress { background: var(--panel-soft); border-radius: 999px; height: 5px; margin-top: 8px; overflow: hidden; }
.goal-progress i { background: var(--primary); border-radius: inherit; display: block; height: 100%; margin-inline-end: auto; }
.goal-collapsed-actions { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 14px; color: var(--text); font-size: .75rem; padding: 12px; text-align: center; }
.goal-card[open] .goal-collapsed-actions { display: none; }
.goal-card-body { display: grid; gap: 10px; padding: 0 14px 14px; }
.goal-card-body > p { color: var(--muted); font-size: .6875rem; line-height: 1.8; margin: 0; }
.goal-card-body .goal-monthly-saving { color: var(--text); font-size: .75rem; }
.goal-financial-details, .goal-management { color: var(--muted); font-size: .6875rem; min-width: 0; }
.goal-financial-details > summary, .goal-management > summary { cursor: pointer; }
.goal-financial-details > small { display: block; margin-top: 8px; }
.goal-financial-details .installment-meta { margin-block: 8px; }
.goal-financial-details .installment-meta span { overflow-wrap: anywhere; }
.goal-card .goal-transfer-box { background: transparent; border: 0; display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); margin: 0; padding: 0; }
.goal-transfer-box label { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; display: grid; gap: 10px; padding: 14px; }
.goal-transfer-box label > span { color: var(--muted); font-size: .6875rem; }
.goal-transfer-box input[inputmode='numeric'] { background: transparent; border: 0; border-radius: 4px; box-shadow: none; min-height: 28px; padding: 0; }
.goal-card .goal-transfer-actions { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.goal-transfer-actions button { justify-content: center; min-height: 42px; }
.goals-page .goal-scenario-details { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 14px; margin: 0; padding: 0; }
.goal-scenario-details > summary { cursor: pointer; list-style: none; padding: 12px; text-align: center; }
.goal-scenario-details > summary::-webkit-details-marker { display: none; }
.goal-scenario-list, .goal-ledger-list { padding: 0 12px 12px; }
.goal-ledger-list span { background: var(--panel); border-color: var(--line); }
.goal-card-body .goal-edit-button { justify-content: center; min-height: 42px; width: 100%; }
.goal-management .installment-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
@media (max-width: 760px) {
  .goals-card-list { grid-template-columns: minmax(0, 1fr); }
  .goals-metrics > div { padding: 10px; }
  .goals-metrics strong { font-size: .95rem; }
}
</style>
