import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('vue', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue')>(),
  onMounted: vi.fn(),
  onBeforeUnmount: vi.fn(),
}))

import { startBudgetyar, useBudgetyar } from '../playground/composables/useBudgetyar'

describe('device persistence failures', () => {
  const app = useBudgetyar()
  startBudgetyar()
  let records: Map<string, string>
  let failedKeys: Set<string>

  beforeEach(async () => {
    records = new Map()
    failedKeys = new Set()
    vi.stubGlobal('window', { setTimeout: vi.fn(), requestAnimationFrame: vi.fn(() => 1), cancelAnimationFrame: vi.fn() })
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => records.get(key) ?? null),
      removeItem: vi.fn((key: string) => records.delete(key)),
      setItem: vi.fn((key: string, value: string) => {
        if (failedKeys.has(key)) throw new Error('QuotaExceededError')
        records.set(key, value)
      }),
    })
    app.retryDeviceStorage()
    app.toasts.value = []
    await nextTick()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps unsaved changes in memory and reports failure without throwing', async () => {
    const key = 'budgetyar-transactions-v1'
    failedKeys.add(key)
    app.transactions.value = [{ id: 1, title: 'unsaved', amount: 100, type: 'income', date: '1405/08/26' }]
    app.pushToast('‏ثبت شد ✅', true)
    await nextTick()
    expect(app.deviceStorageError.value).toBe(true)
    expect(app.transactions.value[0].title).toBe('unsaved')
    expect(JSON.parse(app.buildBackupJson()).transactions[0].title).toBe('unsaved')
    expect(app.toasts.value.some((item) => item.text.includes('✅'))).toBe(false)
  })

  it('keeps the warning when another collection saves successfully', async () => {
    failedKeys.add('budgetyar-budgets-v1')
    app.budgets.value = [{ category: 'other', budget: 100 }]
    await nextTick()
    app.transactions.value = []
    await nextTick()
    expect(app.deviceStorageError.value).toBe(true)
  })

  it('retries using the current values and clears the warning after all saves succeed', async () => {
    failedKeys.add('budgetyar-budgets-v1')
    app.budgets.value = [{ category: 'other', budget: 100 }]
    await nextTick()
    app.budgets.value[0].budget = 200
    await nextTick()
    app.retryDeviceStorage()
    expect(app.deviceStorageError.value).toBe(true)
    failedKeys.clear()
    app.retryDeviceStorage()
    expect(app.deviceStorageError.value).toBe(false)
    expect(JSON.parse(records.get('budgetyar-budgets-v1')!)).toEqual([{ category: 'other', budget: 200 }])
  })

  it('handles storage access being denied and can recover', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(() => app.retryDeviceStorage()).not.toThrow()
    expect(app.deviceStorageError.value).toBe(true)
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      removeItem: (key: string) => records.delete(key),
      setItem: (key: string, value: string) => records.set(key, value),
    })
    app.retryDeviceStorage()
    expect(app.deviceStorageError.value).toBe(false)
  })

  it('clears a failed key when a later edit is persisted successfully', async () => {
    failedKeys.add('budgetyar-subscriptions-v1')
    app.subscriptions.value = [{ id: 's1', title: 'subscription', endDate: '1405/09/01' }]
    await nextTick()
    expect(app.deviceStorageError.value).toBe(true)
    failedKeys.clear()
    app.subscriptions.value = []
    await nextTick()
    expect(app.deviceStorageError.value).toBe(false)
  })

  it('shows a success message after persistence succeeds', async () => {
    app.budgets.value = [{ category: 'other', budget: 300 }]
    app.pushToast('‏بودجه به‌روزرسانی شد', true)
    await nextTick()
    expect(app.deviceStorageError.value).toBe(false)
    expect(app.toasts.value.at(-1)?.text).toBe('‏بودجه به‌روزرسانی شد')
  })

  it('rolls back an imported file when the real persistence watcher cannot save it', async () => {
    app.confirmDialog.unregisterUi()
    window.confirm = vi.fn(() => true)
    app.transactions.value = [{ id: 10, title: 'original', amount: 100, type: 'income', date: '1405/08/26' }]
    await nextTick()
    const backup = JSON.parse(app.buildBackupJson())
    backup.transactions[0].title = 'imported'
    const raw = JSON.stringify(backup)
    failedKeys.add('budgetyar-transactions-v1')
    await app.importBackup({ target: { files: [{ size: raw.length, text: async () => raw }], value: 'backup.json' } } as unknown as Event)
    expect(app.transactions.value[0].title).toBe('original')
    expect(app.deviceStorageError.value).toBe(true)
    expect(app.toasts.value.at(-1)?.text).toContain('ناموفق بود')
    expect(app.toasts.value.some((item) => item.text.includes('✅'))).toBe(false)
  })
})
