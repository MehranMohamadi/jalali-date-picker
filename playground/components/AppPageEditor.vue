<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  editing?: boolean
  editingLabel?: string
}>(), { editing: false, editingLabel: '‏ویرایش' })
const editor = ref<HTMLDetailsElement | null>(null)

async function open() {
  if (!editor.value) return
  editor.value.open = true
  await nextTick()
  editor.value?.scrollIntoView({ block: 'start', behavior: 'auto' })
  editor.value?.querySelector<HTMLInputElement>('input:not([type="checkbox"]):not([type="hidden"]):not(:disabled)')?.focus({ preventScroll: true })
}
defineExpose({ open })

watch(() => props.editing, (editing) => {
  if (!editor.value) return
  editor.value.open = editing
}, { flush: 'post' })
</script>

<template>
  <details ref="editor" class="workspace-editor" :open="editing">
    <summary class="primary-button">{{ editing ? editingLabel : label }}</summary>
    <div class="workspace-editor-content"><slot /></div>
  </details>
</template>
