<script setup lang="ts">
const { state, apply } = useAppUpdates()
</script>

<template>
  <aside v-if="state.demo || (state.ready && !state.dismissed)" class="app-update-notice glass-panel" role="status" aria-live="polite" dir="rtl">
    <strong>{{ state.demo ? '‏تست نمایشی آپدیت' : `‏نسخهٔ ${state.version || 'جدید'} آماده است` }}</strong>
    <p>{{ state.demo ? '‏این پیام آزمایشی است؛ هیچ نسخه‌ای دانلود یا نصب نمی‌شود.' : state.notes }}</p>
    <p v-if="!state.demo && state.message">{{ state.message }}</p>
    <div class="app-update-actions">
      <button v-if="!state.demo" class="primary-button" type="button" :disabled="state.busy" @click="apply">‏اعمال به‌روزرسانی</button>
      <button class="primary-button" type="button" @click="state.demo = false; state.dismissed = true">{{ state.demo ? '‏تست را دیدم' : '‏بعداً' }}</button>
    </div>
  </aside>
</template>

<style scoped>
.app-update-notice{position:fixed;inset-inline:16px;bottom:90px;z-index:150;max-width:460px;margin-inline:auto;padding:16px;box-shadow:0 12px 40px #0008;background:var(--panel-bg,#111827)}
.app-update-notice p{font-size:13px;line-height:1.8;margin:8px 0}
.app-update-actions{display:flex;gap:8px;flex-wrap:wrap}
</style>
