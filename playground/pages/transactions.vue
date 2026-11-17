<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next'
import { toPersianDigits } from '../../src/utils/digits'
import { formatJalaliDate } from '../../src/utils/format'
import { parseJalaliInput, toGregorian } from '../../src/utils/jalali'

const budgetyar = useBudgetyar()
const {
  query,
  selectedMonth,
  selectedYear,
  selectedCategory,
  selectedType,
  pickerDateRange,
  months,
  years,
  categories,
  filteredTransactions,
  isMobileViewport,
  getCategory,
  getTag,
  getPaymentMethodLabel,
  formatMoney,
  formatCompact,
  openModal,
  editTransaction,
  removeTransaction,
} = budgetyar

const currentPage = ref(1)
const transactionPageSize = computed(() => (isMobileViewport.value ? 24 : 80))
const pageCount = computed(() => Math.max(1, Math.ceil(filteredTransactions.value.length / transactionPageSize.value)))
const visibleTransactions = computed(() => filteredTransactions.value.slice((currentPage.value - 1) * transactionPageSize.value, currentPage.value * transactionPageSize.value))
const transactionTypes = ['همه', 'هزینه', 'درآمد'] as const
const transactionGroups = computed(() => {
  const groups = new Map<string, typeof visibleTransactions.value>()
  for (const item of visibleTransactions.value) {
    const parsed = parseJalaliInput(item.date)
    const date = parsed ? formatJalaliDate(parsed, { digitMode: 'latin' }) : item.date
    const group = groups.get(date) ?? []
    group.push(item)
    groups.set(date, group)
  }
  return [...groups].map(([date, items]) => ({ date, items, label: dateGroupLabel(date) }))
})

function dateGroupLabel(date: string) {
  const parsed = parseJalaliInput(date)
  if (!parsed) return toPersianDigits(date)
  const iso = toGregorian(parsed.year, parsed.month, parsed.day)
  const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
  return `${weekday} · ${toPersianDigits(date)}`
}

const filteredIncomeTotal = computed(() => filteredTransactions.value
  .filter((item) => item.type === 'income')
  .reduce((sum, item) => sum + item.amount, 0))

const filteredExpenseTotal = computed(() => filteredTransactions.value
  .filter((item) => item.type === 'expense' && item.sourceType !== 'credit-payment')
  .reduce((sum, item) => sum + item.amount, 0))

const filteredCategoryExpenseTotals = computed(() => {
  const groups = new Map<string, { key: string; label: string; icon: string; amount: number }>()

  filteredTransactions.value
    .filter((item) => item.type === 'expense' && item.sourceType !== 'credit-payment')
    .forEach((item) => {
      const category = getCategory(item.category ?? 'other')
      const current = groups.get(category.key) ?? {
        key: category.key,
        label: category.label,
        icon: category.icon,
        amount: 0,
      }
      current.amount += item.amount
      groups.set(category.key, current)
    })

  return [...groups.values()].sort((a, b) => b.amount - a.amount)
})

function categoryExpenseShare(amount: number) {
  if (!filteredExpenseTotal.value) return '0%'
  return `${Math.round((amount / filteredExpenseTotal.value) * 100)}%`
}

onMounted(() => {
  selectedType.value = 'همه'
})

watch([filteredTransactions, isMobileViewport], () => {
  currentPage.value = 1
})
</script>

<template>
  <section class="transactions-page" aria-label="‏تراکنش‌ها" data-section="تراکنش‌ها">
    <label class="transaction-search transaction-filter-field">
      <span>‏جستجو</span>
      <input v-model="query" type="search" placeholder="‏عنوان، توضیح یا برچسب..." />
    </label>

    <div class="transaction-type-tabs" role="group" aria-label="‏نوع تراکنش">
      <button v-for="type in transactionTypes" :key="type" type="button" :class="{ active: selectedType === type }" :aria-pressed="selectedType === type" @click="selectedType = type">{{ type }}</button>
    </div>

    <section class="glass-panel transaction-filter-panel" aria-labelledby="transaction-filters-title">
      <h2 id="transaction-filters-title">‏فیلترها</h2>
      <div class="transaction-filter-field">
        <span>‏ماه / سال</span>
        <div class="transaction-month-year">
          <BudgetyarSelect v-model="selectedMonth" aria-label="‏ماه">
            <option value="همه">‏همه ماه‌ها</option>
            <option v-for="month in months" :key="month" :value="month">{{ month }}</option>
          </BudgetyarSelect>
          <BudgetyarSelect v-model="selectedYear" aria-label="‏سال">
            <option value="همه">‏همه سال‌ها</option>
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </BudgetyarSelect>
        </div>
      </div>
      <div class="transaction-filter-field">
        <span>‏دسته</span>
        <BudgetyarSelect v-model="selectedCategory" aria-label="‏دسته">
          <option value="همه">‏همه دسته‌ها</option>
          <option v-for="category in categories" :key="category.key" :value="category.label">{{ category.label }}</option>
        </BudgetyarSelect>
      </div>
      <details class="transaction-extra-filters" :open="!!pickerDateRange.start || !!pickerDateRange.end">
        <summary>‏بازهٔ دلخواه و جمع دسته‌ها</summary>
        <JalaliRangeDatePicker
          v-model="pickerDateRange"
          class="date-range-filter"
          placeholder="‏از تاریخ تا تاریخ"
          popover-class="date-picker-popover"
        />
    <div v-if="filteredCategoryExpenseTotals.length" class="category-expense-summary" aria-label="جمع هزینه دسته‌ها">
      <div class="category-expense-summary__head">
        <span>جمع هزینه دسته‌ها</span>
        <strong>{{ formatMoney(filteredExpenseTotal) }}</strong>
      </div>
      <div class="category-expense-chips">
        <article v-for="item in filteredCategoryExpenseTotals" :key="item.key" class="category-expense-chip">
          <span class="category-expense-chip__icon" aria-hidden="true">{{ item.icon }}</span>
          <div>
            <strong>{{ item.label }}</strong>
            <small>{{ categoryExpenseShare(item.amount) }} از هزینه‌ها</small>
          </div>
          <b>{{ formatMoney(item.amount) }}</b>
        </article>
      </div>
    </div>
      </details>
    </section>

    <div class="transaction-totals" aria-live="polite">
      <div><small>‏جمع هزینه</small><strong>{{ formatCompact(filteredExpenseTotal) }}</strong></div>
      <div><small>‏جمع درآمد</small><strong>{{ formatCompact(filteredIncomeTotal) }}</strong></div>
    </div>

    <div v-if="filteredTransactions.length" class="transaction-date-groups">
      <section v-for="group in transactionGroups" :key="group.date" class="transaction-date-group" :aria-label="group.label">
        <h3>{{ group.label }}</h3>
        <details v-for="item in group.items" :key="item.id" class="transaction-entry" :class="item.type">
          <summary class="transaction-entry-summary">
        <div class="transaction-entry-main">
          <strong>{{ item.title }}</strong>
          <small>
            {{ item.type === 'income' ? 'درآمد' : getCategory(item.category).label }}
            <i>·</i>
            {{ item.type === 'income' ? '‏واریزی' : getPaymentMethodLabel(item) }}
            <template v-if="item.type === 'expense'"> · {{ item.isEssential === false ? '‏غیرضروری' : '‏ضروری' }}</template>
          </small>
        </div>
        <strong class="transaction-entry-amount">{{ formatMoney(item.amount) }}</strong>
          </summary>
        <div class="transaction-entry-details">
          <p v-if="item.description">{{ item.description }}</p>
        <div v-if="item.type === 'expense'" class="transaction-entry-tags">
          <span
            v-for="subKey in item.tags ?? []"
            :key="subKey"
            class="sub-category-tag"
            :title="`تگ: ${getTag(subKey)?.label ?? ''}`"
          >
            {{ getTag(subKey)?.icon }} {{ getTag(subKey)?.label }}
          </span>
          <span v-if="item.isLoan">‏قرض: {{ item.loanPerson }}</span>
        </div>

        <div class="transaction-entry-actions">
          <button class="soft-button" type="button" :aria-label="`‏ویرایش ${item.title}`" @click="editTransaction(item)">
            <Pencil :size="15" aria-hidden="true" />
            <span>‏ویرایش</span>
          </button>
          <button class="soft-button danger" type="button" :aria-label="`‏حذف ${item.title}`" @click="removeTransaction(item.id)">
            <Trash2 :size="15" aria-hidden="true" />
            <span>‏حذف</span>
          </button>
        </div>
        </div>
        </details>
      </section>
      <nav class="transaction-pagination" aria-label="‏صفحه‌بندی تراکنش‌ها">
        <button v-if="currentPage > 1" type="button" @click="currentPage--">‏قبلی</button>
        <span aria-live="polite">‏صفحه {{ toPersianDigits(currentPage) }} ‏از {{ toPersianDigits(pageCount) }}</span>
        <button v-if="currentPage < pageCount" type="button" @click="currentPage++">‏بعدی</button>
      </nav>
    </div>

    <EmptyState
      v-else
      title="‏تراکنشی پیدا نشد."
      text="‏فیلترها را تغییر دهید یا تراکنش جدیدی ثبت کنید."
    />
    <button class="primary-button transaction-new" type="button" @click="openModal('expense')">‏تراکنش جدید</button>
  </section>
</template>

<style scoped>
.transactions-page { display: grid; gap: 10px; min-width: 0; }
.transactions-page .transaction-filter-field { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; display: grid; gap: 8px; margin: 0; min-width: 0; padding: 13px 14px; }
.transaction-filter-field > span { color: var(--muted); font-size: .6875rem; }
.transactions-page .transaction-search input[type='search'] { background: transparent; border: 0; border-radius: 4px; box-shadow: none; color: var(--text); min-height: 28px; padding: 0; }
.transaction-type-tabs { display: grid; gap: 6px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.transaction-type-tabs button { background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 16px; color: var(--text); font-size: .75rem; min-height: 38px; padding: 7px; }
.transaction-type-tabs button.active { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.transactions-page .transaction-filter-panel { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px; display: grid; gap: 10px; padding: 12px; }
.transaction-filter-panel h2 { color: var(--text); font-size: .875rem; font-weight: 600; margin: 0; }
.transaction-month-year { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.transaction-filter-field :deep(.budgetyar-select-trigger) { background: transparent; border: 0; border-radius: 4px; color: var(--text); font-size: .8125rem; min-height: 28px; padding: 0; }
.transaction-filter-field :deep(.budgetyar-select-chevron) { color: var(--muted); width: 13px; }
.transactions-page :deep(.budgetyar-select-menu) { background: var(--panel-strong); border-color: var(--line-strong); }
.transactions-page :deep(.budgetyar-select-option.selected) { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.transaction-extra-filters { color: var(--muted); font-size: .6875rem; min-width: 0; }
.transaction-extra-filters summary { cursor: pointer; }
.transaction-extra-filters > .date-range-filter { margin-top: 10px; max-width: 100%; }
.transactions-page .category-expense-summary { border: 1px solid var(--line); margin-top: 10px; padding: 10px; }
.transactions-page .category-expense-chips { grid-template-columns: minmax(0, 1fr); }
.transaction-totals { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.transaction-totals > div { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 16px; display: grid; gap: 8px; min-width: 0; padding: 12px; }
.transaction-totals small { color: var(--muted); font-size: .6875rem; }
.transaction-totals strong { color: var(--text); font-size: 1.05rem; font-weight: 600; overflow-wrap: anywhere; }
.transaction-date-groups, .transaction-date-group { display: grid; gap: 10px; min-width: 0; }
.transaction-date-group h3 { color: var(--muted); font-size: .6875rem; font-weight: 400; margin: 3px 0; }
.transaction-entry { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 17px; min-width: 0; }
.transaction-entry-summary { align-items: center; cursor: pointer; display: flex; gap: 14px; justify-content: space-between; list-style: none; min-height: 72px; padding: 12px 14px; }
.transaction-entry-summary::-webkit-details-marker { display: none; }
.transaction-entry-main { display: grid; gap: 8px; min-width: 0; }
.transaction-entry-main > strong { color: var(--text); font-size: .8125rem; font-weight: 500; overflow-wrap: anywhere; }
.transaction-entry-main small { color: var(--muted); font-size: .625rem; line-height: 1.8; }
.transaction-entry-main i { font-style: normal; }
.transaction-entry-amount { color: var(--primary); flex-shrink: 0; font-size: .6875rem; font-weight: 500; max-width: 45%; text-align: left; }
.transaction-entry-details { border-top: 1px solid var(--line); padding: 10px 14px; }
.transaction-entry-details > p { color: var(--muted-2); font-size: .75rem; margin: 0 0 8px; overflow-wrap: anywhere; }
.transaction-entry-tags { color: var(--muted); display: flex; flex-wrap: wrap; font-size: .6875rem; gap: 6px; }
.transaction-entry-actions { display: flex; gap: 8px; margin-top: 8px; }
.transaction-entry-actions .danger { color: var(--danger); }
.transaction-pagination { align-items: center; background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 16px; color: var(--text); display: flex; font-size: .75rem; gap: 10px; justify-content: center; min-height: 42px; padding: 4px 10px; }
.transaction-pagination button { background: transparent; border: 0; border-radius: 8px; color: var(--text); font: inherit; min-height: 34px; padding: 5px 10px; }
.transactions-page .transaction-new { display: flex; justify-content: center; min-height: 44px; width: 100%; }
@media (min-width: 761px) {
  .transaction-filter-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .transaction-filter-panel > h2, .transaction-filter-panel > details { grid-column: 1 / -1; }
}
</style>
