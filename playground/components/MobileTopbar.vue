<script setup lang="ts">
import { Menu, Plus } from 'lucide-vue-next'

defineProps<{
  title: string
  open: boolean
}>()

const emit = defineEmits<{
  openMenu: []
  quickAdd: []
}>()
</script>

<template>
  <header class="mobile-topbar glass-panel">
    <button class="hamburger" type="button" :aria-expanded="open" aria-label="‏منو" @click="emit('openMenu')">
      <Menu :size="20" aria-hidden="true" />
    </button>
    <div class="mobile-brand">
      <img src="/icons/icon-192.png" alt="‏جیب‌طلا" class="mobile-mascot" width="34" height="34" />
      <div class="mobile-title">
        <strong>‏جیب‌طلا</strong>
        <small>{{ title }}</small>
      </div>
    </div>
    <PrivacyToggle class="mobile-privacy-toggle" />
    <button class="mobile-add" type="button" aria-label="‏ثبت هزینه" @click="emit('quickAdd')">
      <Plus :size="20" aria-hidden="true" />
    </button>
  </header>
</template>

<style scoped>
.mobile-privacy-toggle { flex: 0 0 38px; padding: 8px; }
.mobile-privacy-toggle :deep(span) { display: none; }
@media (max-width: 760px) {
  .mobile-topbar { grid-template-columns: 40px minmax(0, 1fr) 40px 40px; }
}
</style>
