<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  categorizationRuleForm,
  editingCategorizationRuleId,
  categorizationRules,
  activeCategorizationRules,
  suggestedCategorizationRules,
  categories,
  ruleMinAmountInWords,
  ruleMaxAmountInWords,
  formatMoneyInput,
  updateMoneyInput,
  addCategorizationRule,
  editCategorizationRule,
  deleteCategorizationRule,
  toggleCategorizationRule,
  applyCategorizationRulesToAllTransactions,
  acceptSuggestedCategorizationRule,
  getCategory,
} = budgetyar

function matchTypeLabel(value: string) {
  const labels: Record<string, string> = {
    contains: 'شامل متن',
    equals: 'برابر',
    startsWith: 'شروع با',
    endsWith: 'پایان با',
    regex: 'الگو',
    amountRange: 'بازه مبلغ',
    merchant: 'فروشنده',
  }
  return labels[value] ?? value
}
</script>

<template>
  <section class="glass-panel settings-card">
    <div class="section-title">
      <div>
        <h2>قوانین دسته‌بندی</h2>
        <p>دسته‌بندی خودکار تراکنش‌ها بر اساس متن، مبلغ یا فروشنده</p>
      </div>
      <button class="soft-button" type="button" @click="applyCategorizationRulesToAllTransactions">اعمال روی تراکنش‌های قبلی</button>
    </div>

    <div class="report-grid">
      <span><small>کل قوانین</small><strong>{{ categorizationRules.length }}</strong></span>
      <span><small>فعال</small><strong>{{ activeCategorizationRules.length }}</strong></span>
      <span><small>پیشنهاد</small><strong>{{ suggestedCategorizationRules.length }}</strong></span>
      <span><small>اولویت بعدی</small><strong>{{ categorizationRuleForm.priority }}</strong></span>
    </div>

    <form class="installment-form planning-form" @submit.prevent="addCategorizationRule">
      <div v-if="editingCategorizationRuleId" class="installment-edit-banner"><strong>ویرایش قانون</strong></div>
      <label><span>عنوان قانون</span><input v-model="categorizationRuleForm.title" required /></label>
      <label>
        <span>نوع تطبیق</span>
        <select v-model="categorizationRuleForm.matchType">
          <option value="contains">شامل متن</option>
          <option value="equals">برابر</option>
          <option value="startsWith">شروع با</option>
          <option value="endsWith">پایان با</option>
          <option value="regex">Regex</option>
          <option value="amountRange">بازه مبلغ</option>
          <option value="merchant">فروشنده</option>
        </select>
      </label>
      <label><span>متن / الگو</span><input v-model="categorizationRuleForm.pattern" /></label>
      <label><span>فروشنده</span><input v-model="categorizationRuleForm.merchantName" /></label>
      <label>
        <span>حداقل مبلغ</span>
        <input :value="formatMoneyInput(categorizationRuleForm.minAmount)" inputmode="numeric" @input="updateMoneyInput(categorizationRuleForm, 'minAmount', $event)" />
        <small v-if="ruleMinAmountInWords" class="amount-in-words">{{ ruleMinAmountInWords }}</small>
      </label>
      <label>
        <span>حداکثر مبلغ</span>
        <input :value="formatMoneyInput(categorizationRuleForm.maxAmount)" inputmode="numeric" @input="updateMoneyInput(categorizationRuleForm, 'maxAmount', $event)" />
        <small v-if="ruleMaxAmountInWords" class="amount-in-words">{{ ruleMaxAmountInWords }}</small>
      </label>
      <label>
        <span>دسته مقصد</span>
        <select v-model="categorizationRuleForm.categoryId">
          <option v-for="category in categories" :key="category.key" :value="category.key">{{ category.icon }} {{ category.label }}</option>
        </select>
      </label>
      <label>
        <span>نوع تراکنش</span>
        <select v-model="categorizationRuleForm.transactionType">
          <option value="">همه</option>
          <option value="expense">هزینه</option>
          <option value="income">درآمد</option>
        </select>
      </label>
      <label>
        <span>روش پرداخت</span>
        <select v-model="categorizationRuleForm.paymentMethod">
          <option value="">همه</option>
          <option value="cash">نقدی</option>
          <option value="credit">اعتباری</option>
        </select>
      </label>
      <label><span>اولویت</span><input v-model.number="categorizationRuleForm.priority" type="number" min="1" /></label>
      <label class="check-row"><input v-model="categorizationRuleForm.isActive" type="checkbox" /><span>فعال</span></label>
      <label class="check-row"><input v-model="categorizationRuleForm.applyToExisting" type="checkbox" /><span>بعد از ذخیره روی قبلی‌ها اعمال شود</span></label>
      <button class="primary-button" type="submit">{{ editingCategorizationRuleId ? 'ذخیره' : 'افزودن قانون' }}</button>
    </form>

    <section v-if="suggestedCategorizationRules.length" class="weekly-category-budget glass-panel planning-inline">
      <div class="weekly-category-head"><strong>پیشنهادها</strong><small>از تراکنش‌های تکراری</small></div>
      <div class="weekly-category-list">
        <span v-for="suggestion in suggestedCategorizationRules" :key="`${suggestion.title}-${suggestion.categoryId}`">
          <b>{{ suggestion.title }}</b>
          <em>{{ getCategory(suggestion.categoryId).label }}</em>
          <button class="primary-button" type="button" @click="acceptSuggestedCategorizationRule(suggestion)">قبول</button>
        </span>
      </div>
    </section>

    <div v-if="categorizationRules.length" class="installments-grid planning-card-grid">
      <article v-for="rule in categorizationRules" :key="rule.id" class="installment-item">
        <div class="installment-item-head">
          <div><strong>{{ rule.title }}</strong><small>{{ matchTypeLabel(rule.matchType) }} · {{ rule.pattern || rule.merchantName || 'بازه مبلغ' }}</small></div>
          <span>{{ rule.isActive ? 'فعال' : 'خاموش' }}</span>
        </div>
        <div class="installment-meta">
          <span>دسته: {{ getCategory(rule.categoryId).label }}</span>
          <span>اولویت: {{ rule.priority }}</span>
        </div>
        <div class="installment-actions">
          <button class="soft-button" type="button" @click="toggleCategorizationRule(rule.id)">{{ rule.isActive ? 'خاموش' : 'فعال' }}</button>
          <button class="soft-button" type="button" @click="editCategorizationRule(rule)">ویرایش</button>
          <button class="soft-button" type="button" @click="deleteCategorizationRule(rule.id)">حذف</button>
        </div>
      </article>
    </div>
    <EmptyState v-else compact title="هنوز قانونی نداری." text="برای دسته‌بندی خودکار یک قانون ساده بساز." />
  </section>
</template>
