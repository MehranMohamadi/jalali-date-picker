<script setup lang="ts">
import { Plus, Trash2, X } from 'lucide-vue-next'

const budgetyar = useBudgetyar()
const {
  categories,
  categoryForm,
  categoryTotals,
  formatMoneyInput,
  formatMoney,
  updateMoneyInput,
  updateBudget,
  addCategory,
  deleteCategory,
  progressPercent,
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

const isSuggestedCategoriesOpen = ref(false)

function addSuggestedCategory(suggestion: (typeof suggestedCategories)[number]) {
  Object.assign(categoryForm, {
    label: suggestion.label,
    icon: suggestion.icon,
    budget: 0,
  })
  addCategory()
}
</script>

<template>
  <section class="glass-panel budgets-card" data-section="بودجه‌ها">
    <div class="section-title">
      <div>
        <h2>بودجه‌های دسته‌بندی</h2>
        <p>بودجه هر بخش را کوتاه و مستقیم مدیریت کنید.</p>
      </div>
    </div>

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
        <span>بودجه</span>
        <input
          :value="formatMoneyInput(categoryForm.budget)"
          type="text"
          inputmode="numeric"
          @input="updateMoneyInput(categoryForm, 'budget', $event)"
        />
      </label>
      <button class="primary-button" type="submit">
        <Plus :size="17" aria-hidden="true" />
        <span>افزودن دسته</span>
      </button>
    </form>

    <div class="suggested-categories-trigger">
      <div>
        <strong>دسته‌های پیشنهادی</strong>
        <small>{{ availableSuggestedCategories.length }} پیشنهاد آماده‌ی افزودن</small>
      </div>
      <button class="soft-button" type="button" @click="isSuggestedCategoriesOpen = true">
        <Plus :size="16" aria-hidden="true" />
        <span>مشاهده پیشنهادها</span>
      </button>
    </div>

    <div v-if="isSuggestedCategoriesOpen" class="modal-backdrop" @click.self="isSuggestedCategoriesOpen = false">
      <section class="modal glass-panel suggested-categories-modal" role="dialog" aria-modal="true" aria-labelledby="suggested-categories-title">
        <div class="section-title compact">
          <div>
            <h2 id="suggested-categories-title">دسته‌های پیشنهادی</h2>
            <p>برای افزودن، روی دسته‌ی موردنظر بزنید.</p>
          </div>
          <button class="icon-button" type="button" aria-label="بستن" @click="isSuggestedCategoriesOpen = false">
            <X :size="18" aria-hidden="true" />
          </button>
        </div>
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
      </section>
    </div>

    <div class="budget-grid">
      <article v-for="item in categoryTotals" :key="item.key" class="budget-item">
        <div>
          <strong>{{ item.icon }} {{ item.label }}</strong>
          <button v-if="item.key !== 'other'" class="delete-category" type="button" aria-label="حذف دسته" @click="deleteCategory(item.key)">
            <Trash2 :size="15" aria-hidden="true" />
            <span>حذف</span>
          </button>
        </div>
        <span>بودجه: {{ formatMoney(item.budget) }}</span>
        <label class="budget-edit">
          <span>ویرایش بودجه</span>
          <input :value="formatMoneyInput(item.budget)" type="text" inputmode="numeric" @change="updateBudget(item.key, $event)" />
        </label>
        <div class="progress" :class="{ danger: item.spent > item.budget }">
          <i :style="{ width: `${progressPercent(item.spent, item.budget)}%` }" />
        </div>
        <small>مصرف: {{ formatMoney(item.spent) }}</small>
        <em v-if="item.spent > item.budget">⚠️ از بودجه این بخش عبور کرده‌اید.</em>
      </article>
    </div>
  </section>
</template>
