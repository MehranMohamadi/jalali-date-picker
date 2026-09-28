<script setup lang="ts">
import { Cloud, CloudDownload, CloudUpload, Download, HardDrive, Palette, PlugZap, RefreshCw, Smartphone, Upload } from 'lucide-vue-next'
import { APP_VERSION } from '../version'

const budgetyar = useBudgetyar()
const updates = useAppUpdates()
const updateState = updates.state
const isDevelopment = import.meta.dev
const backupInput = ref<HTMLInputElement | null>(null)
const {
  themeMode,
  isStandalone,
  isAndroidNative,
  cloudAuthStatus,
  cloudAuthMessage,
  cloudSnapshotVersion,
  cloudSyncStatus,
  cloudSyncMessage,
  storageMode,
  cloudDirty,
  canLoadDevelopmentData,
  setThemeMode,
  exportReport,
  importBackup,
  loadDevelopmentData,
  installApp,
  setStorageMode,
  testCloudConnection,
  migrateLocalDataToCloud,
  downloadCloudSnapshot,
} = budgetyar

function chooseBackupFile() {
  backupInput.value?.click()
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-layout">
      <section class="settings-panel glass-panel">
        <div class="settings-panel-head">
          <span class="settings-panel-icon"><Palette :size="20" aria-hidden="true" /></span>
          <div><h2>‏ظاهر برنامه</h2><p>‏رنگی را انتخاب کن که خواندنش برایت راحت‌تر است.</p></div>
        </div>
        <div class="theme-options" role="group" aria-label="‏پوستهٔ برنامه">
          <button type="button" class="theme-option" :class="{ active: themeMode === 'dark' }" :aria-pressed="themeMode === 'dark'" @click="setThemeMode('dark')">
            <span class="theme-swatch dark" aria-hidden="true" />‏تاریک
          </button>
          <button type="button" class="theme-option" :class="{ active: themeMode === 'light' }" :aria-pressed="themeMode === 'light'" @click="setThemeMode('light')">
            <span class="theme-swatch light" aria-hidden="true" />‏روشن
          </button>
          <button type="button" class="theme-option" :class="{ active: themeMode === 'forest' }" :aria-pressed="themeMode === 'forest'" @click="setThemeMode('forest')">
            <span class="theme-swatch forest" aria-hidden="true" />‏بنفش
          </button>
        </div>
      </section>

      <section class="settings-panel glass-panel">
        <div class="settings-panel-head">
          <span class="settings-panel-icon"><HardDrive :size="20" aria-hidden="true" /></span>
          <div><h2>‏پشتیبان‌گیری</h2><p>‏یک نسخه از اطلاعاتت را در فایل نگه دار یا فایل قبلی را بازیابی کن.</p></div>
        </div>
        <div class="settings-actions">
          <button class="primary-button settings-action" type="button" @click="exportReport('JSON')">
            <Download :size="18" aria-hidden="true" />‏ذخیرهٔ فایل پشتیبان
          </button>
          <button class="soft-button settings-action" type="button" @click="chooseBackupFile">
            <Upload :size="18" aria-hidden="true" />‏بازیابی از فایل
          </button>
          <input ref="backupInput" class="settings-file-input" type="file" accept="application/json,.json" aria-label="‏انتخاب فایل پشتیبان" @change="importBackup" />
        </div>
      </section>

      <section class="settings-panel settings-panel-wide glass-panel">
        <div class="settings-panel-head">
          <span class="settings-panel-icon"><Cloud :size="20" aria-hidden="true" /></span>
          <div><h2>‏محل نگهداری اطلاعات</h2><p>‏اطلاعات روی دستگاه می‌ماند؛ در صورت تمایل می‌توانی نسخهٔ ابری هم داشته باشی.</p></div>
        </div>
        <div class="storage-options" role="group" aria-label="‏محل نگهداری اطلاعات">
          <button type="button" class="storage-option" :class="{ active: storageMode === 'local' }" :aria-pressed="storageMode === 'local'" @click="setStorageMode('local')">
            <HardDrive :size="20" aria-hidden="true" />
            <span><strong>‏فقط این دستگاه</strong><small>‏بدون نیاز به حساب کاربری</small></span>
          </button>
          <button type="button" class="storage-option" :class="{ active: storageMode === 'cloud' }" :aria-pressed="storageMode === 'cloud'" @click="setStorageMode('cloud')">
            <Cloud :size="20" aria-hidden="true" />
            <span><strong>‏فضای ابری</strong><small>‏با حساب کاربری و انتقال دلخواه</small></span>
          </button>
        </div>
        <p v-if="storageMode === 'local'" class="settings-hint">‏اطلاعات فعلی روی این دستگاه است. برای نگهداری یک نسخهٔ دیگر، فایل پشتیبان بگیر.</p>
        <div v-else class="cloud-controls">
          <p v-if="cloudAuthStatus === 'checking' || cloudAuthStatus === 'unknown'" class="settings-hint" role="status">‏در حال بررسی حساب…</p>
          <NuxtLink v-else-if="cloudAuthStatus === 'unauthenticated'" to="/login" class="primary-button settings-action">‏ورود یا ساخت حساب</NuxtLink>
          <button v-else-if="cloudAuthStatus === 'unavailable'" class="soft-button settings-action" type="button" @click="budgetyar.checkCloudSession">‏تلاش دوباره برای اتصال</button>
          <template v-else-if="cloudAuthStatus === 'authenticated'">
            <p class="settings-hint" role="status">
              {{ cloudDirty ? '‏تغییرات این دستگاه هنوز همگام‌سازی نشده‌اند.' : cloudSnapshotVersion ? '‏یک نسخه از اطلاعات در فضای ابری وجود دارد.' : '‏برای شروع، اطلاعات این دستگاه را ارسال کن یا نسخهٔ ابری را دریافت کن.' }}
            </p>
            <div class="settings-actions">
              <button class="primary-button settings-action" type="button" :disabled="cloudSyncStatus === 'working'" @click="migrateLocalDataToCloud">
                <CloudUpload :size="18" aria-hidden="true" />‏ارسال اطلاعات این دستگاه
              </button>
              <button class="soft-button settings-action" type="button" :disabled="cloudSyncStatus === 'working'" @click="downloadCloudSnapshot">
                <CloudDownload :size="18" aria-hidden="true" />‏دریافت اطلاعات ابری
              </button>
            </div>
            <details class="settings-details">
              <summary>‏عیب‌یابی اتصال</summary>
              <button class="soft-button settings-action" type="button" :disabled="cloudSyncStatus === 'working'" @click="testCloudConnection">
                <PlugZap :size="18" aria-hidden="true" />‏آزمایش اتصال
              </button>
            </details>
          </template>
          <p v-if="cloudAuthStatus === 'unavailable' && cloudAuthMessage" class="settings-message" role="alert">{{ cloudAuthMessage }}</p>
          <p v-if="cloudSyncMessage && cloudSyncStatus !== 'idle'" class="settings-message" role="status">{{ cloudSyncMessage }}</p>
        </div>
      </section>

      <section class="settings-panel settings-panel-wide glass-panel">
        <div class="settings-panel-head">
          <span class="settings-panel-icon"><Smartphone :size="20" aria-hidden="true" /></span>
          <div><h2>‏برنامه</h2><p>‏نسخهٔ فعلی: {{ APP_VERSION }}</p></div>
        </div>
        <div class="settings-actions">
          <button class="soft-button settings-action" type="button" :disabled="updateState.busy" @click="updates.check">
            <RefreshCw :size="18" aria-hidden="true" />{{ updateState.busy ? '‏در حال بررسی…' : '‏بررسی نسخهٔ جدید' }}
          </button>
          <button v-if="updateState.ready" class="primary-button settings-action" type="button" :disabled="updateState.busy" @click="updates.apply">‏اعمال به‌روزرسانی</button>
          <button v-if="!isStandalone && !isAndroidNative" class="soft-button settings-action" type="button" @click="installApp">‏نصب روی دستگاه</button>
        </div>
        <p v-if="updateState.message" class="settings-message" role="status">{{ updateState.message }}</p>
        <details v-if="isDevelopment && canLoadDevelopmentData" class="settings-details">
          <summary>‏ابزار توسعه</summary>
          <button class="soft-button settings-action" type="button" @click="loadDevelopmentData">‏بارگذاری دادهٔ نمونه</button>
        </details>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-page { display: grid; gap: 16px; }
.settings-heading { padding: 2px 4px; }
.settings-heading h1 { font-size: 1.5rem; margin: 0 0 4px; }
.settings-heading p { color: var(--muted); }
.settings-layout { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.settings-panel { align-content: start; display: grid; gap: 16px; min-width: 0; padding: 18px; }
.settings-panel-wide { grid-column: 1 / -1; }
.settings-panel-head { align-items: start; display: flex; gap: 12px; }
.settings-panel-head > div { min-width: 0; }
.settings-panel-head h2 { font-size: 1rem; margin: 0 0 3px; }
.settings-panel-head p { color: var(--muted); font-size: .82rem; line-height: 1.7; }
.settings-panel-icon { align-items: center; background: color-mix(in srgb, var(--primary) 15%, transparent); border-radius: 11px; color: var(--primary); display: inline-flex; flex: 0 0 38px; height: 38px; justify-content: center; }
.theme-options { display: grid; gap: 8px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.theme-option { align-items: center; background: var(--panel-soft); border: 1px solid var(--line); border-radius: 11px; color: var(--text); display: flex; gap: 8px; justify-content: center; min-height: 52px; padding: 8px; }
.theme-option.active, .storage-option.active { background: color-mix(in srgb, var(--primary) 13%, var(--panel-strong)); border-color: var(--primary); }
.theme-swatch { border: 2px solid rgba(148, 163, 184, .45); border-radius: 50%; flex: 0 0 17px; height: 17px; width: 17px; }
.theme-swatch.dark { background: #111827; }
.theme-swatch.light { background: #f8fafc; }
.theme-swatch.forest { background: #382445; }
.settings-actions { display: flex; flex-wrap: wrap; gap: 9px; }
.settings-action { align-items: center; display: inline-flex; gap: 7px; justify-content: center; min-height: 42px; text-align: center; text-decoration: none; }
.settings-file-input { display: none; }
.storage-options { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.storage-option { align-items: center; background: var(--panel-soft); border: 1px solid var(--line); border-radius: 12px; color: var(--text); display: flex; gap: 12px; min-height: 68px; padding: 12px; text-align: right; }
.storage-option > svg { color: var(--primary); flex: 0 0 auto; }
.storage-option span { display: grid; gap: 2px; }
.storage-option small { color: var(--muted); font-size: .74rem; }
.settings-hint, .settings-message { color: var(--muted); font-size: .82rem; line-height: 1.7; margin: 0; }
.cloud-controls { display: grid; gap: 12px; }
.settings-details { border-top: 1px solid var(--line); padding-top: 11px; }
.settings-details summary { color: var(--muted); cursor: pointer; font-size: .8rem; }
.settings-details .settings-action { margin-top: 10px; }
@media (max-width: 760px) {
  .settings-layout, .storage-options { grid-template-columns: 1fr; }
  .settings-panel { padding: 15px; }
  .settings-actions { display: grid; grid-template-columns: 1fr; }
  .theme-option { flex-direction: column; gap: 4px; font-size: .8rem; }
}
</style>
