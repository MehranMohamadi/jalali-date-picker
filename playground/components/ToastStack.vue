<script setup lang="ts">
defineProps<{
  toasts: Array<{ id: number; text: string }>
}>()
</script>

<template>
  <div class="toast-stack" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast glass-panel">{{ toast.text }}</div>
    </TransitionGroup>
  </div>
</template>
