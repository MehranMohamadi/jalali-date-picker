<script setup lang="ts">
defineProps<{
  label: string
  value: string
  icon?: string
  hint?: string
  className?: string
  details?: Array<{ label: string; value: string }>
}>()
</script>

<template>
  <article class="metric-card glass-panel" :class="className">
    <div class="metric-top">
      <span v-if="icon" class="metric-icon" aria-hidden="true">{{ icon }}</span>
      <small>{{ label }}</small>
    </div>
    <strong>
      <span class="counter">{{ value }}</span>
    </strong>
    <p v-if="hint">{{ hint }}</p>
    <div v-if="details?.length" class="metric-details">
      <span v-for="detail in details" :key="detail.label">
        <small>{{ detail.label }}</small>
        <b>− {{ detail.value }}</b>
      </span>
    </div>
  </article>
</template>
