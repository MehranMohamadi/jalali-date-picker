<script setup lang="ts">
import { Download, Smartphone } from 'lucide-vue-next'

const budgetyar = useBudgetyar()
const {
  creditLimit,
  creditExpense,
  creditRemaining,
  themeMode,
  isStandalone,
  formatMoneyInput,
  updateCreditLimit,
  setThemeMode,
  exportReport,
  importBackup,
  installApp,
} = budgetyar

function updateThemeMode(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  setThemeMode(value === 'light' ? 'light' : 'dark')
}
</script>

<template>
  <section class="glass-panel settings-card" data-section="تنظیمات">
    <div class="section-title">
      <div>
        <h2>تنظیمات</h2>
        <p>اعتبار، بکاپ و نگهداری داده‌ها</p>
      </div>
    </div>
    <div class="settings-grid">
      <label>سقف اعتبار
        <input :value="formatMoneyInput(creditLimit)" type="text" inputmode="numeric" @input="updateCreditLimit" />
      </label>
      <label>پرداخت آخر ماه
        <input :value="formatMoneyInput(creditExpense)" type="text" readonly />
      </label>
      <label>اعتبار باقی‌مانده
        <input :value="formatMoneyInput(creditRemaining)" type="text" readonly />
      </label>
      <label>ارز <select><option>تومان</option><option>ریال</option></select></label>
      <label>پوسته
        <select :value="themeMode" @change="updateThemeMode">
          <option value="dark">تاریک</option>
          <option value="light">روشن</option>
        </select>
      </label>
      <label>زبان <select><option>فارسی</option></select></label>
      <label class="backup-import">بازیابی بکاپ
        <input type="file" accept="application/json,.json" @change="importBackup" />
      </label>
      <button class="primary-button pwa-install" type="button" @click="exportReport('JSON')">
        <Download :size="18" aria-hidden="true" />
        <span>ذخیره بکاپ در فایل‌ها</span>
      </button>
      <button v-if="!isStandalone" class="primary-button pwa-install" type="button" @click="installApp">
        <Smartphone :size="18" aria-hidden="true" />
        <span>نصب نسخه PWA</span>
      </button>
    </div>
  </section>
</template>
