import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export function useOutsideClick(target: Ref<HTMLElement | null>, handler: () => void): void {
  const listener = (event: PointerEvent) => {
    const element = target.value
    if (element && !element.contains(event.target as Node)) handler()
  }
  onMounted(() => {
    if (typeof document !== 'undefined') document.addEventListener('pointerdown', listener)
  })
  onBeforeUnmount(() => {
    if (typeof document !== 'undefined') document.removeEventListener('pointerdown', listener)
  })
}
