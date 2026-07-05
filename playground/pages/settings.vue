<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  creditLimit,
  creditExpense,
  creditRemaining,
  isStandalone,
  formatMoneyInput,
  updateCreditLimit,
  exportReport,
  importBackup,
  installApp,
} = budgetyar
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
      <label>پوسته <select><option>فقط تاریک</option></select></label>
      <label>زبان <select><option>فارسی</option></select></label>
      <label class="backup-import">بازیابی بکاپ
        <input type="file" accept="application/json,.json" @change="importBackup" />
      </label>
      <button class="primary-button pwa-install" type="button" @click="exportReport('JSON')">ذخیره بکاپ در فایل‌ها</button>
      <button v-if="!isStandalone" class="primary-button pwa-install" type="button" @click="installApp">نصب نسخه PWA</button>
    </div>
  </section>
</template>
