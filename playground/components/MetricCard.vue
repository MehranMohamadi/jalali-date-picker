<script setup lang="ts">
defineProps<{
  label: string
  value: string
  className?: string
}>()
</script>

<template>
  <article class="metric-card glass-panel" :class="className">
    <div class="metric-top">
      <small>{{ label }}</small>
    </div>
    <strong>
      <span class="counter">{{ value }}</span>
    </strong>
  </article>
</template>
