<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  goalForm,
  editingGoalId,
  goalTargetAmountInWords,
  goalSavedAmountInWords,
  goalTargetDatePickerValue,
  activeGoals,
  archivedGoals,
  categories,
  totalGoalsTarget,
  totalGoalsSaved,
  totalGoalsRemaining,
  formatMoneyInput,
  formatMoney,
  formatCompact,
  updateMoneyInput,
  addGoal,
  editGoal,
  archiveGoal,
  deleteGoal,
  addGoalContribution,
  withdrawFromGoal,
  getGoalProgress,
  getGoalRemainingAmount,
  getGoalSuggestedMonthlySaving,
  getGoalSuggestedWeeklySaving,
  getCategory,
} = budgetyar
</script>

<template>
  <section class="glass-panel settings-card">
    <div class="section-title">
      <div>
        <h2>هدف‌های مالی</h2>
        <p>پس‌انداز، پاکت‌ها و مسیر رسیدن به هدف</p>
      </div>
    </div>

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
        <span>عنوان هدف</span>
        <input v-model="goalForm.title" type="text" placeholder="مثلا صندوق اضطراری" required />
      </label>
      <label>
        <span>مبلغ هدف</span>
        <input :value="formatMoneyInput(goalForm.targetAmount)" inputmode="numeric" required @input="updateMoneyInput(goalForm, 'targetAmount', $event)" />
        <small v-if="goalTargetAmountInWords" class="amount-in-words">{{ goalTargetAmountInWords }}</small>
      </label>
      <label>
        <span>پس‌انداز فعلی</span>
        <input :value="formatMoneyInput(goalForm.savedAmount)" inputmode="numeric" @input="updateMoneyInput(goalForm, 'savedAmount', $event)" />
        <small v-if="goalSavedAmountInWords" class="amount-in-words">{{ goalSavedAmountInWords }}</small>
      </label>
      <label>
        <span>تاریخ هدف</span>
        <JalaliDatePicker v-model="goalTargetDatePickerValue" class="date-picker-field" placeholder="اختیاری" popover-class="date-picker-popover" />
      </label>
      <label>
        <span>دسته</span>
        <select v-model="goalForm.categoryId">
          <option value="">بدون دسته</option>
          <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
        </select>
      </label>
      <label>
        <span>اولویت</span>
        <select v-model="goalForm.priority">
          <option value="high">زیاد</option>
          <option value="medium">متوسط</option>
          <option value="low">کم</option>
        </select>
      </label>
      <label>
        <span>آیکن</span>
        <input v-model="goalForm.icon" maxlength="3" />
      </label>
      <label>
        <span>رنگ</span>
        <input v-model="goalForm.color" type="color" />
      </label>
      <label class="installment-description">
        <span>توضیح</span>
        <textarea v-model="goalForm.note" rows="2" placeholder="اختیاری" />
      </label>
      <button class="primary-button" type="submit">{{ editingGoalId ? 'ذخیره هدف' : 'افزودن هدف' }}</button>
    </form>

    <div v-if="activeGoals.length" class="installments-grid planning-card-grid">
      <article v-for="goal in activeGoals" :key="goal.id" class="installment-item goal-item">
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
          <span>{{ formatMoney(goal.savedAmount) }} از {{ formatMoney(goal.targetAmount) }}</span>
          <span>مانده: {{ formatMoney(getGoalRemainingAmount(goal)) }}</span>
          <span>ماهیانه پیشنهادی: {{ formatCompact(getGoalSuggestedMonthlySaving(goal)) }}</span>
          <span>هفتگی پیشنهادی: {{ formatCompact(getGoalSuggestedWeeklySaving(goal)) }}</span>
        </div>
        <p v-if="goal.note">{{ goal.note }}</p>
        <div class="installment-actions">
          <button class="primary-button" type="button" @click="addGoalContribution(goal)">واریز</button>
          <button class="soft-button" type="button" @click="withdrawFromGoal(goal)">برداشت</button>
          <button class="soft-button" type="button" @click="editGoal(goal)">ویرایش</button>
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
