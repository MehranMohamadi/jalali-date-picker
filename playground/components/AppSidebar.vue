<script setup lang="ts">
import type { Component } from 'vue'
import { ChevronLeft, LogIn, X } from 'lucide-vue-next'

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

const auth = useAuth()
const { currentUser, activeAvatar, initAuth } = auth

onMounted(() => {
  void initAuth()
})

const groupedItems = computed(() => {
  const groups: Array<{ label: string; items: NavItem[] }> = []
  // Exclude /login from scrolling nav groups since it's displayed sticky at the bottom
  const visibleItems = props.items.filter((item) => item.path !== '/login')
  for (const item of visibleItems) {
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
      <span class="brand-mark" aria-hidden="true">
        <img src="/icons/icon-192.png" alt="‏جیب‌طلا" class="brand-mark-img" width="42" height="42" />
      </span>
      <div>
        <strong>‏جیب‌طلا</strong>
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

    <!-- Sticky Bottom User Account / Profile Section -->
    <div class="sidebar-user-footer">
      <!-- When logged in: show profile card with avatar, name, and handle -->
      <NuxtLink
        v-if="currentUser"
        to="/login"
        class="sidebar-user-card"
        :class="{ active: activePath === '/login' }"
        aria-label="‏مشاهده و ویرایش پروفایل کاربری"
        @click="emit('close')"
      >
        <div class="sidebar-user-avatar-wrap">
          <img
            :src="activeAvatar"
            :alt="currentUser.fullName || currentUser.username"
            class="sidebar-user-avatar"
            width="38"
            height="38"
          />
          <span class="user-online-dot" title="‏آنلاین" />
        </div>
        <div class="sidebar-user-info">
          <strong class="sidebar-user-name">{{ currentUser.fullName || currentUser.username }}</strong>
          <span class="sidebar-user-handle" dir="ltr">@{{ currentUser.username }}</span>
        </div>
        <ChevronLeft :size="16" class="sidebar-user-chevron" aria-hidden="true" />
      </NuxtLink>

      <!-- When not logged in: show login / signup button -->
      <NuxtLink
        v-else
        to="/login"
        class="sidebar-auth-button"
        :class="{ active: activePath === '/login' }"
        aria-label="‏ورود یا ثبت‌نام در حساب کاربری"
        @click="emit('close')"
      >
        <LogIn :size="17" aria-hidden="true" />
        <span>‏ورود / ثبت‌نام</span>
      </NuxtLink>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
}

.nav-groups {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.sidebar-user-footer {
  margin-top: auto;
  position: sticky;
  bottom: 0;
  padding-top: 12px;
  background: var(--panel);
  border-top: 1px solid var(--line);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 2;
}

.sidebar-user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--panel-soft);
  border: 1px solid var(--line);
  text-decoration: none;
  color: var(--text);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.sidebar-user-card:hover,
.sidebar-user-card.active {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--primary) 36%, transparent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 15%, transparent);
}

.sidebar-user-avatar-wrap {
  position: relative;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
}

.sidebar-user-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
  background: var(--panel-strong, var(--bg));
  border: 1.5px solid color-mix(in srgb, var(--primary) 40%, var(--line));
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.sidebar-user-card:hover .sidebar-user-avatar,
.sidebar-user-card.active .sidebar-user-avatar {
  border-color: var(--primary);
  transform: scale(1.04);
}

.user-online-dot {
  position: absolute;
  bottom: -1px;
  left: -1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--success, #10b981);
  border: 2px solid var(--panel-strong, var(--bg));
  box-shadow: 0 0 0 1px var(--line);
}

.sidebar-user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  text-align: right;
  gap: 1px;
}

.sidebar-user-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.35;
}

.sidebar-user-handle {
  font-size: 0.72rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.sidebar-user-chevron {
  color: var(--muted);
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.sidebar-user-card:hover .sidebar-user-chevron,
.sidebar-user-card.active .sidebar-user-chevron {
  transform: translateX(-3px);
  color: var(--primary);
}

.sidebar-auth-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  color: var(--primary);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 700;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.sidebar-auth-button:hover,
.sidebar-auth-button.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 28%, transparent);
}
</style>
