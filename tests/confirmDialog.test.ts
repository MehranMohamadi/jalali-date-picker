import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfirm } from '../playground/composables/useConfirm'

describe('useConfirm bottom sheet composable', () => {
  const confirm = useConfirm()

  beforeEach(() => {
    confirm.unregisterUi()
  })

  it('falls back to window.confirm when UI is not mounted', async () => {
    vi.stubGlobal('window', { confirm: vi.fn(() => true) })
    const result = await confirm.askConfirm('آیا مطمئن هستید؟')
    expect(result).toBe(true)
    expect(window.confirm).toHaveBeenCalledWith('آیا مطمئن هستید؟')
    vi.unstubAllGlobals()
  })

  it('opens interactive bottom sheet state when UI is mounted', async () => {
    confirm.registerUi()
    expect(confirm.isOpen.value).toBe(false)

    let resolved = false
    const promise = confirm.askConfirm({
      title: 'حذف داده',
      message: 'آیا مایل به حذف داده‌ها هستید؟',
      confirmText: 'حذف کن',
      cancelText: 'لغو',
      tone: 'danger',
      icon: 'trash',
    }).then((val) => {
      resolved = true
      return val
    })

    expect(confirm.isOpen.value).toBe(true)
    expect(confirm.state.value.title).toBe('حذف داده')
    expect(confirm.state.value.message).toBe('آیا مایل به حذف داده‌ها هستید؟')
    expect(confirm.state.value.confirmText).toBe('حذف کن')
    expect(confirm.state.value.cancelText).toBe('لغو')
    expect(confirm.state.value.tone).toBe('danger')
    expect(confirm.state.value.icon).toBe('trash')
    expect(resolved).toBe(false)

    confirm.onConfirm()
    const result = await promise
    expect(result).toBe(true)
    expect(confirm.isOpen.value).toBe(false)
  })

  it('resolves to false when canceled', async () => {
    confirm.registerUi()

    const promise = confirm.askConfirm({
      message: 'آیا ادامه می‌دهید؟',
    })

    expect(confirm.isOpen.value).toBe(true)
    confirm.onCancel()
    const result = await promise
    expect(result).toBe(false)
    expect(confirm.isOpen.value).toBe(false)
  })

  it('executeWithConfirm executes action when user confirms in UI', async () => {
    confirm.registerUi()
    let actionExecuted = false

    const promise = confirm.executeWithConfirm(() => {
      actionExecuted = true
    }, {
      message: 'تأیید اقدام',
    })

    expect(actionExecuted).toBe(false)
    confirm.onConfirm()
    await promise
    expect(actionExecuted).toBe(true)
  })

  it('executeWithConfirm skips action when user cancels in UI', async () => {
    confirm.registerUi()
    let actionExecuted = false

    const promise = confirm.executeWithConfirm(() => {
      actionExecuted = true
    }, {
      message: 'تأیید اقدام',
    })

    expect(actionExecuted).toBe(false)
    confirm.onCancel()
    await promise
    expect(actionExecuted).toBe(false)
  })
})
