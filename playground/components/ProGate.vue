<script setup lang="ts">
const props = defineProps<{ feature: string; title: string; description?: string }>()
const { billing, canUse } = useBilling()
</script>

<template>
  <slot v-if="canUse(props.feature)" />
  <div v-else-if="billing" class="glass-panel pro-gate" role="note">
    <span class="pro-badge">PRO</span>
    <strong>{{ title }}</strong>
    <p>{{ description || '‏این قابلیت به اشتراک Pro نیاز دارد.' }}</p>
    <NuxtLink to="/pro" class="soft-button">‏مشاهدهٔ Pro</NuxtLink>
  </div>
</template>

<style scoped>
.pro-gate { display: grid; gap: 8px; padding: 16px; }
.pro-gate p { color: var(--muted); margin: 0; }
.pro-gate a { justify-self: start; padding: 8px 14px; text-decoration: none; }
.pro-badge { color: var(--primary); font-size: .72rem; font-weight: 800; }
</style>
