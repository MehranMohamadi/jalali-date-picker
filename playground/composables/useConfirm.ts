import { ref, computed } from 'vue'

export type ConfirmTone = 'danger' | 'warning' | 'primary' | 'info'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: ConfirmTone
  icon?: 'trash' | 'warning' | 'info' | 'refresh' | 'question'
}

interface InternalConfirmState {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  tone: ConfirmTone
  icon?: ConfirmOptions['icon']
}

const isMountedInUi = ref(false)

const state = ref<InternalConfirmState>({
  isOpen: false,
  title: '‏تأیید عملیات',
  message: '',
  confirmText: '‏تأیید',
  cancelText: '‏انصراف',
  tone: 'warning',
})

let activeResolver: ((value: boolean) => void) | null = null

export function useConfirm() {
  function registerUi() {
    isMountedInUi.value = true
  }

  function unregisterUi() {
    isMountedInUi.value = false
    if (activeResolver) {
      activeResolver(false)
      activeResolver = null
    }
    state.value.isOpen = false
  }

  function askConfirm(options: string | ConfirmOptions): Promise<boolean> {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options

    // Fallback for headless environments or unit tests where UI component is not rendered
    if (!isMountedInUi.value && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const result = window.confirm(opts.message)
      return Promise.resolve(result)
    }

    if (activeResolver) {
      activeResolver(false)
      activeResolver = null
    }

    state.value = {
      isOpen: true,
      title: opts.title ?? (opts.tone === 'danger' ? '‏تأیید حذف' : '‏تأیید عملیات'),
      message: opts.message,
      confirmText: opts.confirmText ?? (opts.tone === 'danger' ? '‏حذف' : '‏تأیید'),
      cancelText: opts.cancelText ?? '‏انصراف',
      tone: opts.tone ?? (opts.icon === 'trash' ? 'danger' : 'warning'),
      icon: opts.icon,
    }

    return new Promise<boolean>((resolve) => {
      activeResolver = resolve
    })
  }

  /**
   * Helper that executes synchronous actions immediately in test/headless environments
   * via window.confirm, and asynchronously via bottom-sheet when UI is mounted.
   */
  function executeWithConfirm(
    action: () => void,
    options: string | ConfirmOptions,
  ): Promise<boolean> | boolean {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options

    if (!isMountedInUi.value) {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (window.confirm(opts.message)) {
          action()
          return true
        }
        return false
      }
      action()
      return true
    }

    return askConfirm(opts).then((ok) => {
      if (ok) action()
      return ok
    })
  }

  function onConfirm() {
    state.value.isOpen = false
    if (activeResolver) {
      activeResolver(true)
      activeResolver = null
    }
  }

  function onCancel() {
    state.value.isOpen = false
    if (activeResolver) {
      activeResolver(false)
      activeResolver = null
    }
  }

  return {
    isOpen: computed(() => state.value.isOpen),
    state: computed(() => state.value),
    isMountedInUi: computed(() => isMountedInUi.value),
    registerUi,
    unregisterUi,
    askConfirm,
    executeWithConfirm,
    onConfirm,
    onCancel,
  }
}
