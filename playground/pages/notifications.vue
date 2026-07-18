<script setup lang="ts">
const budgetyar = useBudgetyar()
const {
  isAndroidNative,
  isNotificationsLoading,
  bankNotificationStatus,
  bankApps,
  bankSuggestions,
  selectedBankPackage,
  refreshBankNotifications,
  openNotificationAccessSettings,
  updateSelectedBankPackage,
  acceptBankSuggestion,
  dismissBankSuggestion,
  formatSuggestionDate,
  getCategory,
  formatMoney,
} = budgetyar
</script>

<template>
  <section class="glass-panel notifications-card" data-section="اعلان‌ها">
    <div class="section-title">
      <div>
        <h2>اعلان‌ها</h2>
        <p>پیشنهاد ثبت هزینه از اعلان‌های بانکی</p>
      </div>
      <button class="soft-button" type="button" :disabled="!isAndroidNative || isNotificationsLoading" @click="refreshBankNotifications(true)">
        تازه‌سازی
      </button>
    </div>

    <EmptyState
      v-if="!isAndroidNative"
      title="خواندن اعلان‌ها فقط در نسخه Android Native فعال است."
      text="نسخه PWA و مرورگر به اعلان‌های اپ‌های دیگر گوشی دسترسی ندارند."
    />

    <div v-else class="notification-panel">
      <div class="notification-status-grid">
        <article class="notification-status">
          <small>دسترسی اعلان</small>
          <strong>{{ bankNotificationStatus.isEnabled ? 'فعال' : 'غیرفعال' }}</strong>
          <button class="soft-button" type="button" @click="openNotificationAccessSettings">
            تنظیم دسترسی
          </button>
        </article>
        <label class="notification-status">
          <small>اپ منبع</small>
          <BudgetyarSelect :value="selectedBankPackage" @change="updateSelectedBankPackage">
            <option value="">انتخاب بلو بانک</option>
            <option v-for="app in bankApps" :key="app.packageName" :value="app.packageName">
              {{ app.label }}
            </option>
          </BudgetyarSelect>
        </label>
      </div>

      <div v-if="bankSuggestions.length" class="notification-list">
        <article v-for="suggestion in bankSuggestions" :key="suggestion.id" class="notification-suggestion">
          <div>
            <small>{{ suggestion.sourceApp }} · {{ formatSuggestionDate(suggestion.postTime) }}</small>
            <strong>{{ suggestion.title }}</strong>
            <span>{{ getCategory(suggestion.category).icon }} {{ getCategory(suggestion.category).label }} · {{ formatMoney(suggestion.amount) }}</span>
          </div>
          <div class="notification-actions">
            <button class="primary-button" type="button" @click="acceptBankSuggestion(suggestion)">ثبت هزینه</button>
            <button class="soft-button" type="button" @click="dismissBankSuggestion(suggestion.id)">رد</button>
          </div>
        </article>
      </div>

      <EmptyState
        v-else
        compact
        title="پیشنهاد تازه‌ای ندارید."
        text="بعد از فعال‌سازی دسترسی و انتخاب اپ، اعلان‌های هزینه اینجا می‌آیند."
      />
    </div>
  </section>
</template>
