<script setup lang="ts">
defineProps<{
  title: string
  open: boolean
}>()

const emit = defineEmits<{
  openMenu: []
}>()
</script>

<template>
  <header class="mobile-topbar glass-panel">
    <button class="hamburger" type="button" :aria-expanded="open" aria-label="منو" @click="emit('openMenu')">
      <span />
      <span />
      <span />
    </button>
    <div class="mobile-title">
      <strong>بودجه‌یار</strong>
      <small>{{ title }}</small>
    </div>
  </header>
</template>
