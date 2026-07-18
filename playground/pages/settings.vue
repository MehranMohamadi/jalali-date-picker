<script setup lang="ts">
import { Download, Smartphone } from 'lucide-vue-next'
import { APP_VERSION } from '../version'

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
  setThemeMode(value === 'light' ? 'light' : value === 'forest' ? 'forest' : 'dark')
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
    <div class="settings-grid settings-general-grid">
      <label>سقف اعتبار
        <input :value="formatMoneyInput(creditLimit)" type="text" inputmode="numeric" @input="updateCreditLimit" />
      </label>
      <label>پرداخت آخر ماه
        <input :value="formatMoneyInput(creditExpense)" type="text" readonly />
      </label>
      <label>اعتبار باقی‌مانده
        <input :value="formatMoneyInput(creditRemaining)" type="text" readonly />
      </label>
      <label>ارز <BudgetyarSelect><option>تومان</option><option>ریال</option></BudgetyarSelect></label>
      <label>پوسته
        <BudgetyarSelect :value="themeMode" @change="updateThemeMode">
          <option value="dark">تاریک</option>
          <option value="light">روشن</option>
          <option value="forest">بنفش مه‌آلود</option>
        </BudgetyarSelect>
      </label>
      <label>زبان <BudgetyarSelect><option>فارسی</option></BudgetyarSelect></label>
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
      <div class="app-version">نسخه برنامه: <strong>{{ APP_VERSION }}</strong></div>
    </div>
  </section>
</template>
