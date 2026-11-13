<script setup lang="ts">
import { Bell } from 'lucide-vue-next'

defineProps<{
  title: string
}>()
</script>

<template>
  <header class="mobile-topbar glass-panel">
    <NuxtLink to="/login" class="mobile-brand" aria-label="‏حساب کاربری">
      <img src="/icons/icon-192.png" alt="‏جیب‌طلا" class="mobile-mascot" width="34" height="34" />
      <div class="mobile-title">
        <strong>‏جیب‌طلا</strong>
        <small>{{ title }}</small>
      </div>
    </NuxtLink>
    <PrivacyToggle class="mobile-privacy-toggle" />
    <NuxtLink to="/notifications" class="mobile-notifications" aria-label="‏اعلان‌ها">
      <Bell :size="18" :stroke-width="1.6" aria-hidden="true" />
    </NuxtLink>
  </header>
</template>

<style scoped>
.mobile-brand { color: var(--text); text-decoration: none; }
.mobile-privacy-toggle { flex: 0 0 36px; padding: 7px; }
.mobile-privacy-toggle :deep(span) { display: none; }
@media (max-width: 760px) {
  .mobile-topbar { grid-template-columns: minmax(0, 1fr) 36px 36px; }
}
</style>
