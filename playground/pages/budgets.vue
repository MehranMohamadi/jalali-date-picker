<script setup lang="ts">
const { amountsHidden, privateText } = usePrivacy()
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-vue-next'
import { toPersianDigits } from '../../src/utils/digits'

const budgetyar = useBudgetyar()
const {
  categories,
  tags,
  categoryForm,
  categoryTotals,
  formatMoneyInput,
  formatMoneyWords,
  formatMoney,
  updateMoneyInput,
  updateBudget,
  resetBudgetAmounts,
  addCategory,
  renameCategory,
  deleteCategory,
  progressPercent,
  totalBudget,
  totalExpense,
  formatCompact,
  addTag,
  deleteTag,
} = budgetyar

const suggestedCategories = [
  { label: 'خواربار و سوپرمارکت', icon: '🛒' },
  { label: 'رستوران و غذای بیرون', icon: '🍽️' },
  { label: 'کافه و قهوه', icon: '☕' },
  { label: 'آب، برق و گاز', icon: '💡' },
  { label: 'اینترنت و تلفن', icon: '📱' },
  { label: 'اشتراک‌ها', icon: '🔁' },
  { label: 'بیمه', icon: '🛡️' },
  { label: 'خانه و تعمیرات', icon: '🛠️' },
  { label: 'لوازم خانه', icon: '🛋️' },
  { label: 'سوخت و بنزین', icon: '⛽' },
  { label: 'پارکینگ و عوارض', icon: '🅿️' },
  { label: 'تعمیر و نگهداری خودرو', icon: '🔧' },
  { label: 'زیبایی و مراقبت', icon: '💇' },
  { label: 'دارو و دندان‌پزشکی', icon: '🩺' },
  { label: 'خانواده', icon: '👨‍👩‍👧' },
  { label: 'مهدکودک و نگهداری کودک', icon: '🧸' },
  { label: 'خیریه', icon: '🤝' },
  { label: 'مالیات و عوارض', icon: '🧾' },
  { label: 'کارمزد بانکی', icon: '🏦' },
  { label: 'قسط و بازپرداخت بدهی', icon: '💳' },
  { label: 'پس‌انداز اضطراری', icon: '🧰' },
  { label: 'تکنولوژی', icon: '💻' },
  { label: 'کتاب و آموزش آنلاین', icon: '📚' },
  { label: 'تفریح و سرگرمی دیجیتال', icon: '🎬' },
  { label: 'رویداد و مهمانی', icon: '🎉' },
  { label: 'هزینه کاری', icon: '💼' },
  { label: 'هزینه‌های پیش‌بینی‌نشده', icon: '⚠️' },
  { label: 'پس‌انداز', icon: '🐷' },
] as const

const availableSuggestedCategories = computed(() => {
  const existingLabels = new Set(categories.value.map((category) => category.label.trim().toLocaleLowerCase('fa')))
  return suggestedCategories.filter((suggestion) => !existingLabels.has(suggestion.label.toLocaleLowerCase('fa')))
})

const existingCategoryLabels = computed(() => new Set(categories.value.map((category) => category.label.trim().toLocaleLowerCase('fa'))))

const remainingBudget = computed(() => totalBudget.value - totalExpense.value)
function formatBudgetMetric(value: number) {
  return formatCompact(value).replace(' میلیون تومان', ' م').replace(' هزار تومان', ' ه').replace(' تومان', '')
}
function budgetUsagePercent(spent: number, budget: number) {
  return budget > 0 ? Math.max(0, Math.round(spent / budget * 100)) : 0
}
const editingCategoryKey = ref<string | null>(null)
const editingCategoryLabel = ref('')

function startCategoryRename(key: string, label: string) {
  editingCategoryKey.value = key
  editingCategoryLabel.value = label
}

function saveCategoryRename() {
  if (editingCategoryKey.value && renameCategory(editingCategoryKey.value, editingCategoryLabel.value)) {
    editingCategoryKey.value = null
    editingCategoryLabel.value = ''
  }
}

function addSuggestedCategory(suggestion: (typeof suggestedCategories)[number]) {
  Object.assign(categoryForm, {
    label: suggestion.label,
    icon: suggestion.icon,
    budget: 0,
  })
  addCategory()
}

const newTagName = ref('')
const newTagIcon = ref('🏷️')

function handleCreateTag() {
  const name = newTagName.value.trim()
  if (!name) return
  if (addTag(name, newTagIcon.value || '🏷️')) {
    newTagName.value = ''
    newTagIcon.value = '🏷️'
  }
}
</script>

<template>
  <section class="budgets-page" data-section="بودجه‌ها" aria-label="‏بودجه‌ها">
    <h2 class="budgets-title">‏بودجه‌های این ماه</h2>

    <div class="budget-overview" aria-label="‏خلاصه بودجه ماه">
      <div><small>‏سقف کل</small><strong>{{ formatBudgetMetric(totalBudget) }}</strong></div>
      <div><small>‏مصرف‌شده</small><strong>{{ formatBudgetMetric(totalExpense) }}</strong></div>
      <div :class="{ exceeded: remainingBudget < 0 }"><small>{{ remainingBudget < 0 ? '‏بیش از بودجه' : '‏مانده' }}</small><strong>{{ formatBudgetMetric(Math.abs(remainingBudget)) }}</strong></div>
    </div>

    <section class="glass-panel budget-categories-panel" aria-labelledby="budget-categories-title">
      <h2 id="budget-categories-title">‏دسته‌بندی‌ها</h2>
      <div class="budget-category-list">
        <article v-for="item in categoryTotals" :key="item.key" class="budget-category-row" :class="{ watch: item.budget > 0 && item.spent >= item.budget * .9, exceeded: item.budget > 0 && item.spent > item.budget }">
          <h3>{{ item.label }}</h3>
          <p>{{ formatCompact(item.spent) }} ‏از {{ item.budget > 0 ? formatCompact(item.budget) : '‏سقف تعیین‌نشده' }}<template v-if="item.budget > 0"> · {{ privateText(`${toPersianDigits(budgetUsagePercent(item.spent, item.budget))}٪`) }}</template></p>
          <div class="budget-category-progress" role="progressbar" :aria-label="item.label" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="amountsHidden || item.budget <= 0 ? undefined : progressPercent(item.spent, item.budget)" :aria-valuetext="amountsHidden ? '‏پنهان' : item.budget > 0 ? `${toPersianDigits(budgetUsagePercent(item.spent, item.budget))}٪` : '‏سقف تعیین نشده'">
            <i :style="{ width: `${!amountsHidden && item.budget > 0 ? progressPercent(item.spent, item.budget) : 0}%` }" />
          </div>
        </article>
      </div>
      <details class="budget-management">
        <summary class="soft-button">‏ویرایش سقف بودجه</summary>
        <div class="budget-grid">
          <article v-for="item in categoryTotals" :key="item.key" class="budget-item">
            <div>
              <form v-if="editingCategoryKey === item.key" class="category-rename" @submit.prevent="saveCategoryRename">
                <input v-model="editingCategoryLabel" type="text" :aria-label="`‏نام جدید دسته ${item.label}`" maxlength="80" @keydown.esc.prevent="editingCategoryKey = null" />
                <button class="icon-button" type="submit" aria-label="‏ذخیره نام دسته"><Check :size="17" aria-hidden="true" /></button>
                <button class="icon-button" type="button" aria-label="‏لغو ویرایش نام دسته" @click="editingCategoryKey = null"><X :size="17" aria-hidden="true" /></button>
              </form>
              <template v-else>
                <strong>{{ item.icon }} {{ item.label }}</strong>
                <div class="category-title-actions">
                  <button class="icon-button" type="button" :aria-label="`‏ویرایش نام دسته ${item.label}`" @click="startCategoryRename(item.key, item.label)"><Pencil :size="15" aria-hidden="true" /></button>
                  <button v-if="item.key !== 'other'" class="delete-category" type="button" :aria-label="`‏حذف دسته ${item.label}`" @click="deleteCategory(item.key)">
                    <Trash2 :size="15" aria-hidden="true" />
                    <span>‏حذف</span>
                  </button>
                </div>
              </template>
            </div>
            <div class="budget-amounts">
              <div><small>‏مصرف‌شده</small><b>{{ formatMoney(item.spent) }}</b></div>
              <div><small>‏سقف بودجه</small><b>{{ item.budget > 0 ? formatMoney(item.budget) : '‏تعیین نشده' }}</b></div>
            </div>
            <label class="budget-edit">
              <span>‏بودجه (تومان) · با خروج از کادر ذخیره می‌شود</span>
              <input :disabled="amountsHidden" :value="amountsHidden ? '••••' : formatMoneyInput(item.budget)" type="text" inputmode="numeric" @change="updateBudget(item.key, $event)" />
              <small v-if="item.budget" class="amount-in-words">{{ formatMoneyWords(item.budget) }}</small>
            </label>
            <p class="budget-status" :class="{ exceeded: item.budget > 0 && item.spent > item.budget }">
              <template v-if="item.budget > 0">{{ formatMoney(Math.abs(item.budget - item.spent)) }} {{ item.spent > item.budget ? '‏بیش از بودجه' : '‏باقی مانده' }}</template>
              <template v-else>‏برای این دسته سقف بودجه تعیین کن.</template>
            </p>
          </article>
        </div>
        <button class="soft-button reset-budget-button" type="button" :disabled="totalBudget <= 0" @click="resetBudgetAmounts">
          <RotateCcw :size="16" aria-hidden="true" />
          <span>‏صفرکردن مبلغ بودجه‌ها</span>
        </button>
      </details>
    </section>

    <details class="category-create">
      <summary class="primary-button">‏افزودن دسته</summary>
    <form class="category-manager" @submit.prevent="addCategory">
      <label>
        <span>نام دسته</span>
        <input v-model="categoryForm.label" type="text" placeholder="مثلا قهوه" />
      </label>
      <label>
        <span>آیکن</span>
        <input v-model="categoryForm.icon" type="text" maxlength="3" placeholder="☕" />
      </label>
      <label>
        <span>‏بودجه (تومان)</span>
        <input :disabled="amountsHidden"
          :value="amountsHidden ? '••••' : formatMoneyInput(categoryForm.budget)"
          type="text"
          inputmode="numeric"
          @input="updateMoneyInput(categoryForm, 'budget', $event)"
        />
        <small v-if="categoryForm.budget" class="amount-in-words">{{ formatMoneyWords(categoryForm.budget) }}</small>
      </label>
      <button class="primary-button" type="submit">
        <Plus :size="17" aria-hidden="true" />
        <span>افزودن دسته</span>
      </button>
    </form>

      <details class="budget-suggestions">
        <summary>‏انتخاب از دسته‌های پیشنهادی ({{ availableSuggestedCategories.length }})</summary>
        <div class="suggested-category-list">
          <button
            v-for="suggestion in suggestedCategories"
            :key="suggestion.label"
            class="suggested-category-chip"
            type="button"
            :disabled="existingCategoryLabels.has(suggestion.label.toLocaleLowerCase('fa'))"
            :aria-label="`افزودن دسته ${suggestion.label}`"
            @click="addSuggestedCategory(suggestion)"
          >
            <span>{{ suggestion.icon }}</span>
            <b>{{ suggestion.label }}</b>
            <Plus :size="14" aria-hidden="true" />
          </button>
        </div>
      </details>
    </details>

    <section class="tags-manager-section" aria-label="‏مدیریت تگ‌ها">
      <div class="tags-manager-head">
        <div>
          <h3>‏تگ‌ها</h3>
        </div>
      </div>
      <p v-if="tags.length" class="budget-tag-labels">{{ tags.map((tag) => tag.label).join(' · ') }}</p>
      <p v-else class="budget-tag-labels">‏هنوز برچسبی تعریف نشده است.</p>

      <form class="quick-tag-form" @submit.prevent="handleCreateTag">
        <label class="budget-tag-name-field">
          <span>‏برچسب جدید</span>
          <input v-model="newTagName" type="text" placeholder="‏نام برچسب..." class="tag-name-input" required />
        </label>
        <details class="tag-icon-options">
          <summary>‏انتخاب آیکن</summary>
        <input
          v-model="newTagIcon"
          type="text"
          maxlength="3"
          placeholder="🏷️"
          class="tag-icon-input"
          aria-label="‏آیکون برچسب"
        />
        </details>
        <button class="soft-button quick-tag-submit" type="submit" :disabled="!newTagName.trim()">
          <span>‏افزودن برچسب</span>
        </button>
      </form>

      <details v-if="tags.length" class="budget-tags-management">
        <summary>‏مدیریت برچسب‌ها</summary>
      <div class="defined-tags-list">
        <div v-for="cat in tags" :key="cat.key" class="defined-tag-chip">
          <span class="defined-tag-icon">{{ cat.icon }}</span>
          <span class="defined-tag-label">{{ cat.label }}</span>
          <button
            class="defined-tag-delete"
            type="button"
            :aria-label="`حذف برچسب ${cat.label}`"
            title="‏حذف برچسب"
            @click="deleteTag(cat.key)"
          >
            <X :size="13" aria-hidden="true" />
          </button>
        </div>
      </div>
      </details>
    </section>

    <p class="budget-tags-note">‏تگ‌ها برای جستجو هستند؛ هزینه در دستهٔ اصلی محاسبه می‌شود.</p>
  </section>
</template>

<style scoped>
.budgets-page { display: grid; gap: 12px; min-width: 0; }
.budgets-page .budgets-title { color: var(--text); font-size: .9rem; font-weight: 600; margin: 0; }
.reset-budget-button { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; }
.budget-overview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.budget-overview > div { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; display: grid; gap: 10px; min-width: 0; padding: 12px; }
.budget-overview small { font-size: .7rem; color: var(--muted); }
.budget-overview strong { color: var(--text); font-size: 1.05rem; font-variant-numeric: tabular-nums; font-weight: 600; overflow-wrap: anywhere; }
.budgets-page .budget-categories-panel, .budgets-page .tags-manager-section { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; margin: 0; min-width: 0; padding: 14px; }
.budget-categories-panel h2, .tags-manager-section h3 { color: var(--text); font-size: .9rem; font-weight: 600; margin: 0 0 14px; }
.budget-category-list { display: grid; gap: 20px; }
.budget-category-row h3 { color: var(--text); font-size: .8125rem; font-weight: 400; margin: 0 0 8px; }
.budget-category-row p { color: var(--muted); font-size: .6875rem; line-height: 1.8; margin: 0 0 12px; }
.budget-category-progress { background: var(--panel-soft); border-radius: 999px; height: 5px; overflow: hidden; }
.budget-category-progress i { background: var(--primary); border-radius: inherit; display: block; height: 100%; margin-inline-end: auto; }
.budget-category-row.watch .budget-category-progress i { background: var(--warning); }
.budget-category-row.exceeded .budget-category-progress i { background: var(--danger); }
.budget-management { margin-top: 14px; }
.budget-management > summary { color: var(--text); display: flex; justify-content: center; min-height: 42px; text-align: center; width: 100%; }
.budget-management > summary::-webkit-details-marker { display: none; }
.budget-management .budget-grid { margin-top: 12px; }
.budget-management .budget-item { background: var(--bg-2); border: 1px solid var(--line); border-radius: 14px; padding: 12px; }
.budget-management .reset-budget-button { margin-top: 12px; }
.category-create { margin: 0; }
summary { cursor: pointer; color: var(--primary); font-size: .78rem; min-height: 44px; align-content: center; }
.category-create > summary { display: flex; align-items: center; justify-content: center; list-style: none; width: 100%; }
.category-create > summary::-webkit-details-marker { display: none; }
.category-create .category-manager { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; margin-top: 12px; padding: 14px; }
.budget-suggestions { margin-top: 8px; }
.suggested-category-list { max-height: 280px; overflow-y: auto; }
.suggested-category-chip { min-height: 44px; }
.budget-item { gap: 10px; min-width: 0; }
.budget-item > div:first-child { align-items: center; }
.budget-item strong { white-space: normal; overflow-wrap: anywhere; font-size: .9rem; }
.budget-amounts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.budget-amounts > div { display: grid; gap: 4px; }
.budget-amounts small { font-size: .7rem; }
.budget-amounts b { font-size: .77rem; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.budget-edit { padding-block: 4px 10px; }
.budget-status { font-size: .74rem; color: var(--muted); margin: 0; }
.budget-item .progress { height: 5px; }
.exceeded, .budget-status.exceeded { color: var(--danger); }
.budgets-page .icon-button, .delete-category { min-width: 44px; min-height: 44px; }
.budgets-page input:not([type='color']) { background: var(--bg-2); border-color: var(--line-strong); color: var(--text); }
.budgets-page .budget-tag-labels { color: var(--text); font-size: .75rem; font-weight: 400; line-height: 1.8; margin: 0 0 12px; }
.budgets-page .quick-tag-form { display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); }
.budget-tag-name-field { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; display: grid; gap: 10px; padding: 14px; }
.budget-tag-name-field > span { color: var(--muted); font-size: .6875rem; }
.budgets-page .budget-tag-name-field input { background: transparent; border: 0; border-radius: 4px; box-shadow: none; min-height: 28px; padding: 0; }
.tag-icon-options > summary, .budget-tags-management > summary { color: var(--muted); font-size: .6875rem; min-height: 30px; }
.tag-icon-options .tag-icon-input { width: 64px; }
.budgets-page .quick-tag-submit { justify-content: center; min-height: 42px; width: 100%; }
.budget-tags-management { margin-top: 8px; }
.budget-tags-note { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 17px; color: var(--muted); font-size: .6875rem; line-height: 1.8; margin: 0; padding: 12px 14px; }
.budget-overview .exceeded strong { color: var(--danger); }
@media (max-width: 760px) {
  .budget-overview > div { padding: 10px; }
  .budget-overview strong { font-size: .95rem; }
  .budget-grid { grid-template-columns: 1fr; gap: 12px; margin-top: 8px; }
  .budget-item { padding: 12px; }
  .category-manager { grid-template-columns: minmax(0, 1fr) 64px; margin-top: 0; }
  .category-manager > label:nth-child(3), .category-manager > button { grid-column: 1 / -1; }
  .category-manager input, .budget-edit input, .category-rename input { min-width: 0; width: 100%; font-size: 16px; }
  .category-title-actions { gap: 2px; }
  .delete-category span { display: none; }
}
</style>
