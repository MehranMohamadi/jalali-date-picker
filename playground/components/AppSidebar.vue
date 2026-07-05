<script setup lang="ts">
interface NavItem {
  label: string
  path: string
}

defineProps<{
  items: NavItem[]
  activePath: string
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <aside class="sidebar glass-panel" :class="{ open }">
    <div class="brand">
      <span class="brand-mark">◈</span>
      <div>
        <strong>بودجه‌یار</strong>
        <small>مدیریت مالی شخصی</small>
      </div>
      <button class="drawer-close" type="button" aria-label="بستن منو" @click="emit('close')">×</button>
    </div>

    <nav aria-label="ناوبری اصلی">
      <NuxtLink
        v-for="item in items"
        :key="item.path"
        class="nav-item"
        :class="{ active: activePath === item.path }"
        :to="item.path"
        @click="emit('close')"
      >
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>
