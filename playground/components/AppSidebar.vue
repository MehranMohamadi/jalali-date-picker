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
  padding-top: 10px;
  background: linear-gradient(to top, rgba(15, 23, 42, 0.98) 80%, transparent);
  border-top: 1px solid var(--line, rgba(148, 163, 184, 0.15));
  z-index: 2;
}

.sidebar-user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--line, rgba(148, 163, 184, 0.15));
  text-decoration: none;
  color: var(--text, #e8eef6);
  transition: all 0.2s ease;
}

.sidebar-user-card:hover,
.sidebar-user-card.active {
  background: rgba(42, 168, 154, 0.15);
  border-color: rgba(42, 168, 154, 0.4);
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
  background: #0f172a;
  border: 1.5px solid rgba(42, 168, 154, 0.5);
}

.user-online-dot {
  position: absolute;
  bottom: -1px;
  left: -1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid #0f172a;
}

.sidebar-user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  text-align: right;
}

.sidebar-user-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text, #e8eef6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-user-handle {
  font-size: 0.72rem;
  color: var(--muted, #91a0b4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-user-chevron {
  color: var(--muted, #91a0b4);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.sidebar-user-card:hover .sidebar-user-chevron {
  transform: translateX(-3px);
  color: var(--primary, #2aa89a);
}

.sidebar-auth-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(42, 168, 154, 0.12);
  border: 1px solid rgba(42, 168, 154, 0.3);
  color: var(--primary, #2aa89a);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 700;
  transition: all 0.2s ease;
}

.sidebar-auth-button:hover,
.sidebar-auth-button.active {
  background: var(--primary, #2aa89a);
  color: #fff;
}
</style>
