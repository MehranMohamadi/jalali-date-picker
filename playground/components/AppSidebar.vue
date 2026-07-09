<script setup lang="ts">
import type { Component } from 'vue'
import { X } from 'lucide-vue-next'

interface NavItem {
  label: string
  path: string
  group: string
  icon: Component
}

const props = defineProps<{
  items: NavItem[]
  activePath: string
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const groupedItems = computed(() => {
  const groups: Array<{ label: string; items: NavItem[] }> = []
  for (const item of props.items) {
    const group = groups.find((entry) => entry.label === item.group)
    if (group) group.items.push(item)
    else groups.push({ label: item.group, items: [item] })
  }
  return groups
})
</script>

<template>
  <aside class="sidebar glass-panel" :class="{ open }" aria-label="‏منوی اصلی">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">ب</span>
      <div>
        <strong>‏بودجه‌یار</strong>
        <small>‏مدیریت مالی شخصی</small>
      </div>
      <button class="drawer-close" type="button" aria-label="‏بستن منو" @click="emit('close')">
        <X :size="18" aria-hidden="true" />
      </button>
    </div>

    <nav class="nav-groups" aria-label="‏ناوبری اصلی">
      <section v-for="group in groupedItems" :key="group.label" class="nav-group">
        <p>{{ group.label }}</p>
        <NuxtLink
          v-for="item in group.items"
          :key="item.path"
          class="nav-item"
          :class="{ active: activePath === item.path }"
          :to="item.path"
          @click="emit('close')"
        >
          <component :is="item.icon" class="nav-icon" :size="18" stroke-width="2.2" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </section>
    </nav>
  </aside>
</template>
