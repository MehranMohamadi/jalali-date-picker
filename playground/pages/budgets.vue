<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'

const budgetyar = useBudgetyar()
const {
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
