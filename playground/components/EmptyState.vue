<script setup lang="ts">
defineProps<{
  title: string
  text?: string
  compact?: boolean
}>()
</script>

<template>
  <div class="empty-state" :class="{ 'compact-empty': compact }">
    <div>◇</div>
    <strong>{{ title }}</strong>
    <span v-if="text">{{ text }}</span>
  </div>
</template>
