<script setup lang="ts">
import { CalendarDays, House, MoreHorizontal, Plus, ReceiptText } from 'lucide-vue-next'

const props = defineProps<{
  activePath: string
  open: boolean
}>()

defineEmits<{
  openMenu: []
  quickAdd: []
}>()

const mainPaths = ['/', '/transactions', '/planning']
const moreActive = computed(() => props.open || !mainPaths.includes(props.activePath))
</script>

<template>
  <nav class="bottom-navigation" aria-label="‏ناوبری پایین">
    <NuxtLink to="/" class="bottom-nav-item" :class="{ active: activePath === '/' }" :aria-current="activePath === '/' ? 'page' : undefined">
      <House :size="19" :stroke-width="1.6" aria-hidden="true" />
      <span>‏خانه</span>
    </NuxtLink>
    <NuxtLink to="/transactions" class="bottom-nav-item" :class="{ active: activePath === '/transactions' }" :aria-current="activePath === '/transactions' ? 'page' : undefined">
      <ReceiptText :size="19" :stroke-width="1.6" aria-hidden="true" />
      <span>‏تراکنش‌ها</span>
    </NuxtLink>
    <button class="bottom-nav-add" type="button" aria-label="‏ثبت هزینه" @click="$emit('quickAdd')">
      <Plus :size="24" :stroke-width="1.5" aria-hidden="true" />
    </button>
    <NuxtLink to="/planning" class="bottom-nav-item" :class="{ active: activePath === '/planning' }" :aria-current="activePath === '/planning' ? 'page' : undefined">
      <CalendarDays :size="19" :stroke-width="1.6" aria-hidden="true" />
      <span>‏برنامه</span>
    </NuxtLink>
    <button class="bottom-nav-item" :class="{ active: moreActive }" type="button" :aria-expanded="open" aria-controls="app-navigation" aria-haspopup="dialog" @click="$emit('openMenu')">
      <MoreHorizontal :size="21" :stroke-width="1.6" aria-hidden="true" />
      <span>‏بیشتر</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-navigation { display: none; }

@media (max-width: 760px) {
  .bottom-navigation {
    align-items: center;
    background: color-mix(in srgb, var(--panel-strong) 96%, transparent);
    border: 1px solid var(--line-strong);
    border-radius: 30px;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 8px 28px #0003;
    display: grid;
    gap: 3px;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    inset-inline: 12px;
    margin-inline: auto;
    max-width: 480px;
    padding: 5px 7px;
    position: fixed;
    z-index: 35;
  }

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
</style>
