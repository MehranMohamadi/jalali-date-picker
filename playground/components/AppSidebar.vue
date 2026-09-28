<script setup lang="ts">
import type { Component } from 'vue'
import { ChevronDown, ChevronLeft, LogIn, X } from 'lucide-vue-next'

interface NavItem {
  label: string
  path: string
  group: string
  icon: Component
  secondary?: boolean
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
const { currentUser, activeAvatar, isAuthInitialized, initAuth } = auth
const { isMobileViewport } = useBudgetyar()
const sidebarRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const secondaryItems = computed(() => props.items.filter((item) => item.secondary))
const isSecondaryOpen = ref(false)

watch(() => props.activePath, (path) => {
  if (secondaryItems.value.some((item) => item.path === path)) isSecondaryOpen.value = true
}, { immediate: true })

watch(() => props.open, (open, _, onCleanup) => {
  if (!open) return
  const previousOverflow = document.body.style.overflow
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.body.style.overflow = 'hidden'

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      emit('close')
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...(sidebarRef.value?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  document.addEventListener('keydown', handleKeydown)
  void nextTick(() => closeButtonRef.value?.focus())
  onCleanup(() => {
    document.body.style.overflow = previousOverflow
    document.removeEventListener('keydown', handleKeydown)
    previousFocus?.focus()
  })
})

onMounted(() => {
  void initAuth()
})

const groupedItems = computed(() => {
  const groups: Array<{ label: string; items: NavItem[] }> = []
  // Exclude /login from scrolling nav groups since it's displayed sticky at the bottom
  const visibleItems = props.items.filter((item) => item.path !== '/login' && !item.secondary)
  for (const item of visibleItems) {
    const group = groups.find((entry) => entry.label === item.group)
    if (group) group.items.push(item)
    else groups.push({ label: item.group, items: [item] })
  }
  return groups
})
</script>

<template>
  <aside
    ref="sidebarRef"
    class="sidebar glass-panel"
    :class="{ open }"
    :inert="isMobileViewport && !open"
    :aria-hidden="isMobileViewport && !open ? 'true' : undefined"
    :role="open ? 'dialog' : undefined"
    :aria-modal="open ? 'true' : undefined"
    aria-label="‏منوی اصلی"
  >
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        <img src="/icons/icon-192.png" alt="‏جیب‌طلا" class="brand-mark-img" width="42" height="42" />
      </span>
      <div>
        <strong>‏جیب‌طلا</strong>
        <small>‏مدیریت مالی شخصی</small>
      </div>
      <button ref="closeButtonRef" class="drawer-close" type="button" aria-label="‏بستن منو" @click="emit('close')">
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
      <section v-if="secondaryItems.length" class="nav-group nav-secondary">
        <button
          class="nav-more-toggle"
          type="button"
          :aria-expanded="isSecondaryOpen"
          aria-controls="secondary-nav-items"
          @click="isSecondaryOpen = !isSecondaryOpen"
        >
          <span>‏ابزارهای بیشتر</span>
          <ChevronDown :size="16" :class="{ rotated: isSecondaryOpen }" aria-hidden="true" />
        </button>
        <div v-if="isSecondaryOpen" id="secondary-nav-items" class="nav-secondary-items">
          <NuxtLink
            v-for="item in secondaryItems"
            :key="item.path"
            class="nav-item"
            :class="{ active: activePath === item.path }"
            :to="item.path"
            @click="emit('close')"
          >
            <component :is="item.icon" class="nav-icon" :size="18" stroke-width="2.2" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </section>
    </nav>

    <!-- Sticky Bottom User Account / Profile Section -->
    <div class="sidebar-user-footer">
      <div v-if="!isAuthInitialized" class="sidebar-account-loading" role="status">
        <span class="sidebar-account-spinner" aria-hidden="true" />
        <span>‏در حال بررسی حساب…</span>
      </div>
      <!-- When logged in: show profile card with avatar, name, and handle -->
      <NuxtLink
        v-else-if="currentUser"
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
.nav-more-toggle {
  align-items: center;
  background: var(--panel-soft);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--text);
  display: flex;
  font: inherit;
  justify-content: space-between;
  min-height: 42px;
  padding: 9px 10px;
  text-align: right;
  width: 100%;
}

.nav-more-toggle .rotated { transform: rotate(180deg); }
.nav-secondary-items { display: grid; gap: 5px; }

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

.sidebar-user-card,
.sidebar-auth-button,
.sidebar-account-loading {
  box-sizing: border-box;
  height: 56px;
}

.sidebar-account-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-soft);
  color: var(--muted);
  font-size: 0.88rem;
}

.sidebar-account-spinner {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 2px solid var(--line);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: sidebar-account-spin 0.8s linear infinite;
}

@keyframes sidebar-account-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-account-spinner {
    animation: none;
  }
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

@media (max-width: 760px) {
  .sidebar {
    display: flex;
    flex-direction: column;
  }

  .brand {
    border-bottom: 1px solid var(--line);
    margin-bottom: 12px;
  }

  .brand strong { font-size: 1rem; }
  .brand small { font-size: .76rem; }
  .drawer-close { border-radius: 12px; }

  .nav-groups {
    align-content: start;
    display: grid;
    flex: 1 1 auto;
    gap: 14px;
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 2px 18px;
    scrollbar-width: thin;
  }

  .nav-group {
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .nav-group > p {
    grid-column: 1 / -1;
    padding: 0 4px;
  }

  .nav-group > .nav-item {
    align-content: center;
    background: var(--panel-soft);
    border: 1px solid var(--line);
    border-radius: 14px;
    gap: 7px;
    grid-template-columns: 1fr;
    justify-items: start;
    min-height: 78px;
    padding: 10px 12px;
  }

  .nav-group > .nav-item.active {
    background: color-mix(in srgb, var(--primary) 16%, var(--panel-strong));
    border-color: color-mix(in srgb, var(--primary) 60%, var(--line));
  }

  .nav-group > .nav-item .nav-icon {
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    border-radius: 9px;
    box-sizing: content-box;
    padding: 6px;
  }

  .nav-group > .nav-item span {
    font-size: .82rem;
    font-weight: 700;
  }

  .nav-secondary {
    display: block;
  }

  .nav-more-toggle {
    background: var(--panel-soft);
    border-radius: 12px;
    min-height: 48px;
    padding-inline: 14px;
  }

  .nav-secondary-items {
    gap: 4px;
    padding-top: 8px;
  }

  .nav-secondary-items .nav-item {
    border-bottom: 1px solid var(--line);
    border-radius: 9px;
    min-height: 46px;
  }

  .sidebar-user-footer {
    background: var(--panel-strong);
    flex: 0 0 auto;
    padding-top: 12px;
  }

  .sidebar-user-card,
  .sidebar-auth-button,
  .sidebar-account-loading { min-height: 58px; }
}

@media (max-width: 360px) {
  .nav-group > .nav-item { min-height: 72px; padding: 8px 10px; }
  .nav-group > .nav-item span { font-size: .78rem; }
}
</style>
