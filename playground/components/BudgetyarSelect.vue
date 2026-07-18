<script setup lang="ts">
import { Fragment, computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, type VNode } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  modelValue?: unknown
  value?: unknown
  disabled?: boolean
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  change: [event: { target: { value: unknown } }]
}>()

const slots = useSlots()
const root = ref<HTMLElement | null>(null)
const open = ref(false)
const SELECT_OPEN_EVENT = 'budgetyar-select-open'

function readText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map((item) => readText(item)).join('')
  if (value && typeof value === 'object' && 'children' in value) return readText((value as VNode).children)
  return ''
}

function flattenNodes(nodes: VNode[]): VNode[] {
  return nodes.flatMap((node) => node.type === Fragment && Array.isArray(node.children)
    ? flattenNodes(node.children as VNode[])
    : [node])
}

const options = computed(() => flattenNodes(slots.default?.() ?? [])
  .filter((node) => node.type === 'option')
  .map((node) => ({
    value: node.props?.value ?? readText(node.children),
    label: readText(node.children),
    disabled: Boolean(node.props?.disabled),
  })))

const currentValue = computed(() => props.modelValue !== undefined ? props.modelValue : props.value)
const selectedOption = computed(() => options.value.find((option) => String(option.value) === String(currentValue.value)) ?? options.value[0])

function choose(option: (typeof options.value)[number]) {
  if (option.disabled || props.disabled) return
  emit('update:modelValue', option.value)
  emit('change', { target: { value: option.value } })
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

function onAnotherSelectOpen(event: Event) {
  const source = (event as CustomEvent<HTMLElement | null>).detail
  if (source !== root.value) open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener(SELECT_OPEN_EVENT, onAnotherSelectOpen)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener(SELECT_OPEN_EVENT, onAnotherSelectOpen)
})

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) document.dispatchEvent(new CustomEvent(SELECT_OPEN_EVENT, { detail: root.value }))
  if (open.value) nextTick(() => root.value?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus())
}
</script>

<template>
  <div ref="root" class="budgetyar-select" :class="{ 'is-open': open, 'is-disabled': disabled }" dir="rtl">
    <button class="budgetyar-select-trigger" type="button" :disabled="disabled" :aria-label="ariaLabel" :aria-expanded="open" aria-haspopup="listbox" @click.stop="toggle">
      <span>{{ selectedOption?.label || 'انتخاب کنید' }}</span>
      <ChevronDown class="budgetyar-select-chevron" :size="16" aria-hidden="true" />
    </button>
    <div v-if="open" class="budgetyar-select-menu" role="listbox">
      <button
        v-for="option in options"
        :key="String(option.value)"
        class="budgetyar-select-option"
        :class="{ selected: String(option.value) === String(currentValue) }"
        type="button"
        role="option"
        :aria-selected="String(option.value) === String(currentValue)"
        :disabled="option.disabled"
        @click="choose(option)"
      >{{ option.label }}</button>
    </div>
    <span class="budgetyar-select-source" aria-hidden="true"><slot /></span>
  </div>
</template>
