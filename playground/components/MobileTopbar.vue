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
    <div class="mobile-title">
      <strong>‏پولدار</strong>
      <small>{{ title }}</small>
    </div>
    <button class="mobile-add" type="button" aria-label="‏ثبت هزینه" @click="emit('quickAdd')">
      <Plus :size="20" aria-hidden="true" />
    </button>
  </header>
</template>
