<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next'

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
      <select v-model="selectedMonth" aria-label="ماه">
        <option v-for="month in months" :key="month">{{ month }}</option>
      </select>
      <select v-model="selectedYear" aria-label="سال">
        <option v-for="year in years" :key="year">{{ year }}</option>
      </select>
      <select v-model="selectedCategory" aria-label="دسته">
        <option>همه</option>
        <option v-for="category in categories" :key="category.key">{{ category.label }}</option>
      </select>
      <select v-model="selectedType" aria-label="نوع تراکنش">
        <option>همه</option>
        <option>درآمد</option>
        <option>هزینه</option>
      </select>
      <JalaliRangeDatePicker
        v-model="pickerDateRange"
        class="date-range-filter"
        placeholder="از تاریخ تا تاریخ"
        popover-class="date-picker-popover"
      />
    </div>

    <div v-if="filteredTransactions.length" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>نوع</th>
            <th>عنوان</th>
            <th>دسته</th>
            <th>تاریخ</th>
            <th>مبلغ</th>
            <th>جزئیات</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visibleTransactions" :key="item.id">
            <td><span class="pill" :class="item.type">{{ item.type === 'income' ? 'درآمد' : 'هزینه' }}</span></td>
            <td>{{ item.title }}</td>
            <td>{{ item.type === 'income' ? 'درآمد' : `${getCategory(item.category).icon} ${getCategory(item.category).label}` }}</td>
            <td>{{ item.date }}</td>
            <td>{{ formatMoney(item.amount) }}</td>
            <td>
              <div v-if="item.type === 'expense'" class="transaction-meta">
                <span>{{ getPaymentMethodLabel(item) }}</span>
                <span v-if="item.isEssential === false" class="nonessential-meta" title="غیرضروری" aria-label="غیرضروری">⚠️</span>
                <span v-if="item.isLoan">قرض: {{ item.loanPerson }}</span>
              </div>
              <span v-else>-</span>
            </td>
            <td class="actions transaction-actions">
              <button class="icon-action" type="button" aria-label="‏ویرایش تراکنش" title="ویرایش" @click="editTransaction(item)">
                <Pencil :size="16" aria-hidden="true" />
              </button>
              <button class="icon-action danger" type="button" aria-label="‏حذف تراکنش" title="حذف" @click="removeTransaction(item.id)">
                <Trash2 :size="16" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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
