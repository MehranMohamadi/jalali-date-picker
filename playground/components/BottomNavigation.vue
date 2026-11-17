<script setup lang="ts">
import type { Component } from 'vue'
import { CalendarDays, House, MoreHorizontal, Plus, ReceiptText, X } from 'lucide-vue-next'

interface NavItem {
  label: string
  path: string
  icon: Component
}

const props = defineProps<{
  activePath: string
  open: boolean
  items: NavItem[]
}>()

const emit = defineEmits<{
  toggleMenu: []
  close: []
  quickAdd: []
}>()

const mainPaths = ['/', '/transactions', '/planning']
const moreActive = computed(() => props.open || !mainPaths.includes(props.activePath))
const importantPaths = new Set(['/budgets', '/installments', '/goals', '/analytics', '/subscriptions', '/settings'])
const importantItems = computed(() => props.items.filter((item) => importantPaths.has(item.path)))
const otherItems = computed(() => props.items.filter((item) => !mainPaths.includes(item.path) && !importantPaths.has(item.path)))
const navigation = ref<HTMLElement | null>(null)
const navigationBar = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const { isModalOpen, isMobileViewport } = useBudgetyar()
const transactionOpen = computed(() => isModalOpen.value && isMobileViewport.value)
const expanded = computed(() => props.open || transactionOpen.value)
const panel = ref<'menu' | 'transaction'>('menu')

// Keep the overlay's lower inset aligned with the bar, including font resizing.
// ResizeObserver runs on size changes, not on animation frames.
let barObserver: ResizeObserver | undefined
onMounted(() => {
  if (!navigationBar.value) return
  barObserver = new ResizeObserver(([entry]) => {
    if (entry) navigation.value?.style.setProperty('--bottom-nav-bar-height', `${entry.contentRect.height}px`)
  })
  barObserver.observe(navigationBar.value)
})
onBeforeUnmount(() => barObserver?.disconnect())

watch([() => props.open, transactionOpen], ([menuOpen, formOpen]) => {
  if (formOpen) panel.value = 'transaction'
  else if (menuOpen) panel.value = 'menu'
})

watch(expanded, async (open, _, onCleanup) => {
  if (!open) return
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  onCleanup(() => {
    void nextTick(() => {
      if (!expanded.value && !document.querySelector('[aria-modal="true"], dialog[open]') && previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    })
  })
  await nextTick()
  requestAnimationFrame(() => {
    if (!expanded.value) return
    const target = transactionOpen.value ? navigation.value?.querySelector<HTMLElement>('.transaction-modal') : closeButton.value
    target?.focus({ preventScroll: true })
  })
})

function handleKeydown(event: KeyboardEvent) {
  if (!expanded.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
  if (event.key !== 'Tab') return
  const controls = [...(navigation.value?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? [])]
    .filter((element) => element.getClientRects().length > 0 && !element.closest('[inert]'))
  const first = controls[0]
  const last = controls.at(-1)
  if (event.shiftKey && (document.activeElement === first || document.activeElement === navigation.value?.querySelector('.transaction-modal'))) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <nav ref="navigation" class="bottom-navigation" :class="{ 'is-expanded': expanded }" :role="expanded ? 'dialog' : undefined" :aria-modal="expanded ? 'true' : undefined" :aria-labelledby="expanded ? transactionOpen ? 'transaction-modal-title' : 'expanded-navigation-title' : undefined" aria-label="‏ناوبری پایین" @keydown="handleKeydown">
    <div id="expanded-navigation" class="bottom-nav-expansion" :class="{ open: expanded }" :inert="!expanded" :aria-hidden="!expanded">
      <div class="bottom-nav-expansion-clip">
        <div class="bottom-nav-expanded-content" :class="{ 'has-transaction': panel === 'transaction' }">
          <div v-show="panel === 'menu'" :inert="!open">
          <header class="bottom-nav-menu-heading">
            <div><h2 id="expanded-navigation-title">‏همه بخش‌ها</h2><p>‏دسترسی سریع به جیب‌طلا</p></div>
            <button ref="closeButton" class="bottom-nav-menu-close" type="button" aria-label="‏بستن منو" @click="emit('close')"><X :size="18" aria-hidden="true" /></button>
          </header>
          <div class="bottom-nav-important" aria-label="‏بخش‌های اصلی">
            <NuxtLink v-for="item in importantItems" :key="item.path" :to="item.path" class="bottom-nav-menu-item" :class="{ active: activePath === item.path }" :aria-current="activePath === item.path ? 'page' : undefined" @click="emit('close')">
              <span class="bottom-nav-menu-icon"><component :is="item.icon" :size="21" :stroke-width="1.6" aria-hidden="true" /></span>
              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>
          <h3 class="bottom-nav-tools-title">‏ابزارها و حساب</h3>
          <div class="bottom-nav-tools">
            <NuxtLink v-for="item in otherItems" :key="item.path" :to="item.path" class="bottom-nav-tool" :class="{ active: activePath === item.path }" :aria-current="activePath === item.path ? 'page' : undefined" @click="emit('close')">
              <component :is="item.icon" :size="16" :stroke-width="1.6" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>
          </div>
          <div v-show="panel === 'transaction'" id="bottom-nav-transaction-slot" :inert="!transactionOpen" />
        </div>
      </div>
    </div>
    <div ref="navigationBar" class="bottom-nav-bar">
    <NuxtLink to="/" class="bottom-nav-item" :class="{ active: activePath === '/' }" :aria-current="activePath === '/' ? 'page' : undefined" @click="emit('close')">
      <House :size="19" :stroke-width="1.6" aria-hidden="true" />
      <span>‏خانه</span>
    </NuxtLink>
    <NuxtLink to="/transactions" class="bottom-nav-item" :class="{ active: activePath === '/transactions' }" :aria-current="activePath === '/transactions' ? 'page' : undefined" @click="emit('close')">
      <ReceiptText :size="19" :stroke-width="1.6" aria-hidden="true" />
      <span>‏تراکنش‌ها</span>
    </NuxtLink>
    <button class="bottom-nav-add" type="button" :aria-label="transactionOpen ? '‏بستن فرم تراکنش' : '‏ثبت هزینه'" :aria-expanded="transactionOpen" aria-controls="bottom-nav-transaction-slot" aria-haspopup="dialog" @click="$emit('quickAdd')">
      <Plus :size="24" :stroke-width="1.5" aria-hidden="true" />
    </button>
    <NuxtLink to="/planning" class="bottom-nav-item" :class="{ active: activePath === '/planning' }" :aria-current="activePath === '/planning' ? 'page' : undefined" @click="emit('close')">
      <CalendarDays :size="19" :stroke-width="1.6" aria-hidden="true" />
      <span>‏برنامه</span>
    </NuxtLink>
    <button class="bottom-nav-item" :class="{ active: moreActive }" type="button" :aria-expanded="open" aria-controls="expanded-navigation" aria-haspopup="dialog" @click="emit('toggleMenu')">
      <MoreHorizontal :size="21" :stroke-width="1.6" aria-hidden="true" />
      <span>‏بیشتر</span>
    </button>
    </div>
  </nav>
</template>

<style scoped>
.bottom-navigation { display: none; }

@media (max-width: 760px) {
  .bottom-navigation {
    align-items: center;
    border: 1px solid transparent;
    border-radius: 30px;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    inset-inline: 12px;
    margin-inline: auto;
    max-width: 480px;
    padding: 5px 7px;
    position: fixed;
    z-index: 35;
  }

  .bottom-navigation::before {
    background: color-mix(in srgb, var(--panel-strong) 96%, transparent);
    border: 1px solid var(--line-strong);
    border-radius: inherit;
    box-shadow: 0 8px 28px #0003;
    content: '';
    inset: -1px;
    pointer-events: none;
    position: absolute;
    z-index: -1;
  }
  .bottom-navigation.is-expanded::before { visibility: hidden; }
  .bottom-nav-bar { align-items: center; display: grid; gap: 3px; grid-template-columns: repeat(5, minmax(0, 1fr)); position: relative; width: 100%; z-index: 1; }
  .bottom-navigation.is-expanded { z-index: 40; }
  /* The full panel floats above the bar without changing its layout. Its lower
     padding draws the same continuous surface behind the stationary buttons. */
  .bottom-nav-expansion {
    background: var(--panel);
    border: 1px solid var(--line-strong);
    border-radius: 30px;
    bottom: -1px;
    box-shadow: 0 8px 28px #0003;
    inset-inline: -1px;
    opacity: 0;
    padding: 5px 7px calc(var(--bottom-nav-bar-height, 48px) + 5px);
    pointer-events: none;
    position: absolute;
    transform: translateY(16px);
    transition: transform .26s cubic-bezier(.22, 1, .36, 1), opacity .18s ease, visibility 0s linear .26s;
    transition-duration: .26s, .18s, 0s !important;
    visibility: hidden;
  }
  .bottom-nav-expansion.open { opacity: 1; pointer-events: auto; transform: translateY(0); transition-delay: 0s; visibility: visible; }
  .bottom-nav-expansion-clip { border-radius: 22px 22px 0 0; min-height: 0; overflow: hidden; }
  .bottom-nav-expanded-content { border-bottom: 1px solid var(--line); max-height: calc(100dvh - 112px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); overflow-y: auto; overscroll-behavior: contain; padding: 10px 6px 14px; scrollbar-width: thin; }
  .bottom-nav-expanded-content.has-transaction { overflow: hidden; padding: 0; }
  .bottom-nav-menu-heading { align-items: center; display: flex; gap: 10px; justify-content: space-between; margin-bottom: 14px; }
  .bottom-nav-menu-heading h2 { color: var(--text); font-size: .94rem; font-weight: 600; margin: 0; }
  .bottom-nav-menu-heading p { color: var(--muted); font-size: .6875rem; margin: 5px 0 0; }
  .bottom-nav-menu-close { align-items: center; background: var(--panel-soft); border: 1px solid var(--line); border-radius: 50%; color: var(--muted-2); display: flex; height: 36px; justify-content: center; padding: 0; width: 36px; }
  .bottom-nav-important { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bottom-nav-menu-item { align-items: center; background: var(--panel-soft); border: 1px solid var(--line-strong); border-radius: 17px; color: var(--text); display: flex; font-size: .8125rem; gap: 10px; min-height: 72px; min-width: 0; padding: 12px 10px; text-decoration: none; }
  .bottom-nav-menu-icon { align-items: center; background: color-mix(in srgb, var(--primary) 10%, var(--panel)); border-radius: 12px; color: var(--primary); display: flex; flex: 0 0 36px; height: 36px; justify-content: center; }
  .bottom-nav-menu-item.active { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
  .bottom-nav-menu-item.active .bottom-nav-menu-icon { background: color-mix(in srgb, var(--on-primary) 10%, transparent); color: inherit; }
  .bottom-nav-tools-title { color: var(--muted); font-size: .6875rem; font-weight: 400; margin: 16px 0 10px; }
  .bottom-nav-tools { display: grid; gap: 6px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .bottom-nav-tool { align-items: center; background: var(--bg-2); border: 1px solid var(--line); border-radius: 13px; color: var(--muted-2); display: flex; flex-direction: column; font-size: .625rem; gap: 7px; justify-content: center; min-height: 60px; min-width: 0; padding: 9px 4px; text-align: center; text-decoration: none; }
  .bottom-nav-tool.active { background: color-mix(in srgb, var(--primary) 12%, var(--panel)); border-color: var(--primary); color: var(--primary); }
  .bottom-nav-tool > span, .bottom-nav-menu-item > span:last-child { overflow-wrap: anywhere; }
  .bottom-navigation :is(a, button):focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

  .bottom-nav-item {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 22px;
    color: var(--muted);
    display: flex;
    flex-direction: column;
    font-size: .625rem;
    gap: 3px;
    justify-content: center;
    min-height: 48px;
    min-width: 0;
    padding: 5px 2px;
    text-decoration: none;
  }

  .bottom-nav-item.active { background: color-mix(in srgb, var(--primary) 13%, transparent); color: var(--primary); }
  .bottom-nav-item span { white-space: nowrap; }
  .bottom-nav-add { align-items: center; background: var(--primary); border: 0; border-radius: 50%; color: var(--on-primary); display: flex; height: 44px; justify-content: center; justify-self: center; padding: 0; width: 44px; }
  .bottom-nav-item:focus-visible, .bottom-nav-add:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
}
@media (prefers-reduced-motion: reduce) {
  .bottom-nav-expansion { transition: none; transition-duration: 0s !important; }
}
</style>
