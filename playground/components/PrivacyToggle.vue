<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'
const { amountsHidden, toggleLabel, toggleAmounts } = usePrivacy()
</script>

<template>
  <button class="soft-button privacy-toggle" type="button" :aria-label="toggleLabel" :title="toggleLabel" :aria-pressed="amountsHidden" @click="toggleAmounts">
    <EyeOff v-if="amountsHidden" :size="18" aria-hidden="true" />
    <Eye v-else :size="18" aria-hidden="true" />
    <span>{{ toggleLabel }}</span>
  </button>
</template>

<style scoped>
.privacy-toggle { align-items: center; display: inline-flex; justify-content: center; gap: 7px; min-height: 40px; }
</style>
