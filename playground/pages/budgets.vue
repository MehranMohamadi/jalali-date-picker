<script setup lang="ts">
import { Check, Pencil, Plus, Trash2, X } from 'lucide-vue-next'

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
  <section class="glass-panel budgets-card" data-section="بودجه‌ها">
    <div class="section-title">
      <div>
        <h2>‏بودجه‌های این ماه</h2>
        <p>‏برای هر دسته سقف خرج مشخص کن.</p>
      </div>
    </div>

    <div class="budget-overview" aria-label="‏خلاصه بودجه ماه">
      <div><small>‏کل بودجه</small><strong>{{ formatCompact(totalBudget) }}</strong></div>
      <div><small>‏خرج این ماه</small><strong>{{ formatCompact(totalExpense) }}</strong></div>
      <div :class="{ exceeded: remainingBudget < 0 }"><small>{{ remainingBudget < 0 ? '‏بیش از بودجه' : '‏مانده بودجه' }}</small><strong>{{ formatCompact(Math.abs(remainingBudget)) }}</strong></div>
    </div>

    <details class="category-create">
      <summary><Plus :size="17" aria-hidden="true" />‏افزودن دسته</summary>
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
        <input
          :value="formatMoneyInput(categoryForm.budget)"
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
          <p>‏تگ‌های مستقل برای مرتب‌سازی و جستجوی هزینه‌ها</p>
        </div>
      </div>

      <form class="quick-tag-form" @submit.prevent="handleCreateTag">
        <input
          v-model="newTagIcon"
          type="text"
          maxlength="3"
          placeholder="🏷️"
          class="tag-icon-input"
          aria-label="‏آیکون برچسب"
        />
        <input
          v-model="newTagName"
          type="text"
          placeholder="‏نام برچسب جدید (مثلاً: ناهار کاری، هدیه، تفریح، اسنپ...)"
          class="tag-name-input"
          aria-label="‏نام برچسب"
          required
        />
        <button class="primary-button quick-tag-submit" type="submit" :disabled="!newTagName.trim()">
          <Plus :size="16" aria-hidden="true" />
          <span>‏افزودن برچسب</span>
        </button>
      </form>

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
    </section>

    <div class="budget-grid">
      <article v-for="item in categoryTotals" :key="item.key" class="budget-item">
        <div>
          <form v-if="editingCategoryKey === item.key" class="category-rename" @submit.prevent="saveCategoryRename">
            <input v-model="editingCategoryLabel" type="text" :aria-label="`نام جدید دسته ${item.label}`" maxlength="80" @keydown.esc.prevent="editingCategoryKey = null" />
            <button class="icon-button" type="submit" aria-label="ذخیره نام دسته"><Check :size="17" aria-hidden="true" /></button>
            <button class="icon-button" type="button" aria-label="لغو ویرایش نام دسته" @click="editingCategoryKey = null"><X :size="17" aria-hidden="true" /></button>
          </form>
          <template v-else>
            <strong>{{ item.icon }} {{ item.label }}</strong>
            <div class="category-title-actions">
              <button class="icon-button" type="button" :aria-label="`ویرایش نام دسته ${item.label}`" @click="startCategoryRename(item.key, item.label)"><Pencil :size="15" aria-hidden="true" /></button>
              <button v-if="item.key !== 'other'" class="delete-category" type="button" aria-label="حذف دسته" @click="deleteCategory(item.key)">
                <Trash2 :size="15" aria-hidden="true" />
                <span>حذف</span>
              </button>
            </div>
          </template>
        </div>
        <div class="budget-amounts">
          <div><small>‏مصرف‌شده</small><b>{{ formatMoney(item.spent) }}</b></div>
          <div><small>‏سقف بودجه</small><b>{{ item.budget > 0 ? formatMoney(item.budget) : '‏تعیین نشده' }}</b></div>
        </div>
        <details class="budget-editor">
          <summary>‏ویرایش سقف بودجه</summary>
        <label class="budget-edit">
          <span>‏بودجه (تومان) · با خروج از کادر ذخیره می‌شود</span>
          <input :value="formatMoneyInput(item.budget)" type="text" inputmode="numeric" @change="updateBudget(item.key, $event)" />
          <small v-if="item.budget" class="amount-in-words">{{ formatMoneyWords(item.budget) }}</small>
        </label>
        </details>
        <div class="progress" :class="{ danger: item.budget > 0 && item.spent > item.budget }" aria-hidden="true">
          <i :style="{ width: `${item.budget > 0 ? progressPercent(item.spent, item.budget) : 0}%` }" />
        </div>
        <p class="budget-status" :class="{ exceeded: item.budget > 0 && item.spent > item.budget }">
          <template v-if="item.budget > 0">{{ formatMoney(Math.abs(item.budget - item.spent)) }} {{ item.spent > item.budget ? '‏بیش از بودجه' : '‏باقی مانده' }}</template>
          <template v-else>‏برای این دسته سقف بودجه تعیین کن.</template>
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.budget-overview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 12px 0; border-block: 1px solid var(--line); gap: 8px; }
.budget-overview > div { display: grid; gap: 5px; min-width: 0; }
.budget-overview > div + div { border-inline-start: 1px solid var(--line); padding-inline-start: 8px; }
.budget-overview small { font-size: .7rem; color: var(--muted); }
.budget-overview strong { font-size: .8rem; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.category-create { margin-top: 12px; }
summary { cursor: pointer; color: var(--primary); font-size: .78rem; min-height: 44px; align-content: center; }
.category-create > summary { display: flex; align-items: center; gap: 6px; list-style: none; }
.category-create > summary::-webkit-details-marker { display: none; }
.category-create[open] > summary svg { transform: rotate(45deg); }
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
.budget-editor { grid-row: 5; border-top: 1px solid var(--line); }
.budget-edit { padding-block: 4px 10px; }
.budget-status { font-size: .74rem; color: var(--muted); margin: 0; }
.budget-item .progress { height: 5px; }
.exceeded, .budget-status.exceeded { color: var(--danger); }
.budgets-card .icon-button, .delete-category { min-width: 44px; min-height: 44px; }
@media (max-width: 760px) {
  .budgets-card { padding: 14px; }
  .budget-grid { grid-template-columns: 1fr; gap: 12px; margin-top: 8px; }
  .budget-item { padding: 12px; }
  .category-manager { grid-template-columns: minmax(0, 1fr) 64px; margin-top: 0; }
  .category-manager > label:nth-child(3), .category-manager > button { grid-column: 1 / -1; }
  .category-manager input, .budget-edit input, .category-rename input { min-width: 0; width: 100%; font-size: 16px; }
  .category-title-actions { gap: 2px; }
  .delete-category span { display: none; }
}
</style>
