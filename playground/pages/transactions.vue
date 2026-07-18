<script setup lang="ts">
import { ArrowDownLeft, Pencil, Trash2 } from 'lucide-vue-next'

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
  getPaymentMethodLabel,
  formatMoney,
  editTransaction,
  removeTransaction,
} = budgetyar
const visibleTransactionLimit = ref(isMobileViewport.value ? 24 : 80)
const transactionPageSize = computed(() => (isMobileViewport.value ? 24 : 80))
const visibleTransactions = computed(() => filteredTransactions.value.slice(0, visibleTransactionLimit.value))
const hasMoreTransactions = computed(() => visibleTransactionLimit.value < filteredTransactions.value.length)

onMounted(() => {
  selectedType.value = 'همه'
})

watch([filteredTransactions, isMobileViewport], () => {
  visibleTransactionLimit.value = transactionPageSize.value
})

function showMoreTransactions() {
  visibleTransactionLimit.value += transactionPageSize.value
}
</script>

<template>
  <section class="glass-panel table-card" data-section="تراکنش‌ها">
    <div class="section-title">
      <div>
        <h2>‏تراکنش‌ها</h2>
        <p>‏مرور سریع درآمد و هزینه‌ها با فیلترهای زنده</p>
      </div>
    </div>

    <div class="filters">
      <input v-model="query" type="search" placeholder="جستجو" aria-label="جستجو" />
      <BudgetyarSelect v-model="selectedMonth" aria-label="ماه">
        <option v-for="month in months" :key="month">{{ month }}</option>
      </BudgetyarSelect>
      <BudgetyarSelect v-model="selectedYear" aria-label="سال">
        <option v-for="year in years" :key="year">{{ year }}</option>
      </BudgetyarSelect>
      <BudgetyarSelect v-model="selectedCategory" aria-label="دسته">
        <option>همه</option>
        <option v-for="category in categories" :key="category.key">{{ category.label }}</option>
      </BudgetyarSelect>
      <BudgetyarSelect v-model="selectedType" aria-label="نوع تراکنش">
        <option>همه</option>
        <option>درآمد</option>
        <option>هزینه</option>
      </BudgetyarSelect>
      <JalaliRangeDatePicker
        v-model="pickerDateRange"
        class="date-range-filter"
        placeholder="از تاریخ تا تاریخ"
        popover-class="date-picker-popover"
      />
    </div>

    <div v-if="filteredTransactions.length" class="transaction-compact-list">
      <article v-for="item in visibleTransactions" :key="item.id" class="transaction-compact-card" :class="item.type">
        <span class="transaction-compact-icon" aria-hidden="true">
          <ArrowDownLeft v-if="item.type === 'income'" :size="18" />
          <span v-else>{{ getCategory(item.category).icon }}</span>
        </span>

        <div class="transaction-compact-main">
          <strong>{{ item.title }}</strong>
          <small>
            {{ item.type === 'income' ? 'درآمد' : getCategory(item.category).label }}
            <i>·</i>
            {{ item.date }}
          </small>
        </div>

        <div v-if="item.type === 'expense'" class="transaction-compact-tags">
          <span>{{ getPaymentMethodLabel(item) }}</span>
          <span v-if="item.isEssential === false" class="nonessential-meta" title="غیرضروری" aria-label="غیرضروری">⚠️</span>
          <span v-if="item.isLoan">قرض: {{ item.loanPerson }}</span>
        </div>

        <div class="transaction-compact-amount" :class="item.type">
          <strong>{{ item.type === 'income' ? '+' : '−' }}{{ formatMoney(item.amount) }}</strong>
          <small>{{ item.type === 'income' ? 'واریزی' : 'پرداختی' }}</small>
        </div>

        <div class="transaction-compact-actions">
          <button class="icon-action" type="button" aria-label="‏ویرایش تراکنش" title="ویرایش" @click="editTransaction(item)">
            <Pencil :size="15" aria-hidden="true" />
          </button>
          <button class="icon-action danger" type="button" aria-label="‏حذف تراکنش" title="حذف" @click="removeTransaction(item.id)">
            <Trash2 :size="15" aria-hidden="true" />
          </button>
        </div>
      </article>
      <div v-if="hasMoreTransactions" class="load-more-row">
        <button type="button" class="soft-button" @click="showMoreTransactions">
          نمایش بیشتر
        </button>
      </div>
    </div>

    <EmptyState
      v-else
      title="‏هنوز تراکنشی ثبت نشده است."
      text="‏از دکمه ثبت سریع، اولین درآمد یا هزینه را اضافه کنید."
    />
  </section>
</template>
