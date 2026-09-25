<script setup lang="ts">
import { CloudDownload, CloudUpload, Download, PlugZap, Smartphone } from 'lucide-vue-next'
import { APP_VERSION } from '../version'

const budgetyar = useBudgetyar()
const {
  creditLimit,
  creditExpense,
  creditRemaining,
  themeMode,
  isStandalone,
  cloudAuthStatus,
  cloudAuthMessage,
  cloudSnapshotVersion,
  cloudSyncStatus,
  cloudSyncMessage,
  storageMode,
  cloudDirty,
  formatMoneyInput,
  updateCreditLimit,
  setThemeMode,
  exportReport,
  importBackup,
  installApp,
  setStorageMode,
  testCloudConnection,
  migrateLocalDataToCloud,
  downloadCloudSnapshot,
} = budgetyar

function updateThemeMode(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  setThemeMode(value === 'light' ? 'light' : value === 'forest' ? 'forest' : 'dark')
}

function updateStorageMode(event: Event) {
  setStorageMode((event.target as HTMLSelectElement).value === 'cloud' ? 'cloud' : 'local')
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
    <div class="settings-grid settings-general-grid settings-local-grid">
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
  <section class="glass-panel settings-card" data-section="اتصال هوش مصنوعی">
    <div class="section-title">
      <div>
        <h2>اتصال ابری و هوش مصنوعی</h2>
        <p>همگام‌سازی داده‌ها با بک‌اند شخصی پس از ورود</p>
      </div>
    </div>
    <div class="settings-grid settings-general-grid">
      <label>محل ذخیره‌سازی
        <BudgetyarSelect :value="storageMode" @change="updateStorageMode">
          <option value="local">فقط روی دستگاه (پیش‌فرض)</option>
          <option value="cloud">فضای ابری</option>
        </BudgetyarSelect>
      </label>
      <p v-if="storageMode === 'local'" class="app-version">
        اطلاعات فعلی بدون تغییر در همین دستگاه باقی می‌مانند.
      </p>
      <NuxtLink v-if="storageMode === 'cloud' && cloudAuthStatus !== 'authenticated'" to="/login" class="primary-button pwa-install">ورود یا ساخت حساب برای ذخیرهٔ ابری</NuxtLink>
      <p v-if="storageMode === 'cloud' && cloudAuthMessage" class="app-version" role="status">{{ cloudAuthMessage }}</p>
      <label v-if="storageMode === 'cloud'">وضعیت داده ابری
        <input :value="cloudDirty ? 'در انتظار همگام‌سازی' : cloudSnapshotVersion ? `نسخه ${cloudSnapshotVersion}` : 'هنوز منتقل نشده'" type="text" readonly />
      </label>
      <button v-if="storageMode === 'cloud' && cloudAuthStatus === 'authenticated'" class="primary-button pwa-install" type="button" :disabled="cloudSyncStatus === 'working'" @click="testCloudConnection">
        <PlugZap :size="18" aria-hidden="true" />
        <span>تست اتصال بک‌اند</span>
      </button>
      <button v-if="storageMode === 'cloud' && cloudAuthStatus === 'authenticated'" class="primary-button pwa-install" type="button" :disabled="cloudSyncStatus === 'working'" @click="migrateLocalDataToCloud">
        <CloudUpload :size="18" aria-hidden="true" />
        <span>انتقال داده‌های این دستگاه به ابر</span>
      </button>
      <button v-if="storageMode === 'cloud' && cloudAuthStatus === 'authenticated'" class="primary-button pwa-install" type="button" :disabled="cloudSyncStatus === 'working'" @click="downloadCloudSnapshot">
        <CloudDownload :size="18" aria-hidden="true" />
        <span>دریافت داده‌های ابری روی این دستگاه</span>
      </button>
      <p v-if="storageMode === 'cloud' && cloudSyncMessage" class="app-version" role="status">{{ cloudSyncMessage }}</p>
    </div>
  </section>
</template>
