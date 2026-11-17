import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { DEVICE_SCHEMA_KEY, deviceFields } from '../src/utils/deviceStorage'

vi.mock('vue', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue')>(), onMounted: vi.fn(), onBeforeUnmount: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web', isNativePlatform: () => false }, registerPlugin: vi.fn(() => ({})) }))

describe('loading and backup round trips', () => {
  let records: Map<string, string>
  let app: ReturnType<typeof import('../playground/composables/useBudgetyar')['useBudgetyar']>

  async function freshApp() {
    vi.resetModules()
    const module = await import('../playground/composables/useBudgetyar')
    return module.useBudgetyar()
  }

  beforeEach(async () => {
    records = new Map()
    vi.stubGlobal('window', { confirm: vi.fn(() => true), setTimeout: vi.fn(), requestAnimationFrame: vi.fn(() => 1), cancelAnimationFrame: vi.fn() })
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => { records.set(key, value) },
      removeItem: (key: string) => { records.delete(key) },
    })
    app = await freshApp()
    app.confirmDialog.unregisterUi()
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each(['{', 'null', '[{"id":1}]', '[{"id":1,"type":"income","title":"invalid","amount":-1,"date":"1405/08/26"}]'])('preserves invalid raw data and blocks writes', (raw) => {
    records.set(deviceFields.transactions, raw)
    expect(app.loadDeviceData()).toBe(false)
    app.transactions.value = []
    app.retryDeviceStorage()
    expect(records.get(deviceFields.transactions)).toBe(raw)
    expect(app.deviceReadBlocked.value).toBe(true)
  })

  it('does not replace data when storage reading is denied, and retries reading later', () => {
    const storage = localStorage
    vi.stubGlobal('localStorage', { ...storage, getItem: () => { throw new Error('SecurityError') } })
    expect(app.loadDeviceData()).toBe(false)
    expect(records.size).toBe(0)
    vi.stubGlobal('localStorage', storage)
    app.retryDeviceStorage()
    expect(app.deviceReadBlocked.value).toBe(false)
    expect(records.get(DEVICE_SCHEMA_KEY)).toBe('1')
  })

  it('does not delete corrupt cloud configuration or overwrite finance data', () => {
    records.set('budgetyar-cloud-settings-v1', '{')
    records.set(deviceFields.transactions, '[]')
    expect(app.loadDeviceData()).toBe(false)
    expect(records.get('budgetyar-cloud-settings-v1')).toBe('{')
    expect(records.get(deviceFields.transactions)).toBe('[]')
  })

  it('does not partially commit a migration when a later collection cannot be written', () => {
    const oldGoals = JSON.stringify([{ id: 'legacy', title: 'goal', targetAmount: 1000, savedAmount: 200, priority: 'medium' }])
    records.set(deviceFields.goals, oldGoals)
    const setItem = localStorage.setItem
    localStorage.setItem = (key, value) => {
      if (key === deviceFields.debts) throw new Error('quota')
      setItem(key, value)
    }
    expect(app.loadDeviceData()).toBe(true)
    expect(app.deviceStorageError.value).toBe(true)
    expect(records.get(deviceFields.goals)).toBe(oldGoals)
    expect(records.has(deviceFields.goalTransactions)).toBe(false)
    localStorage.setItem = setItem
    app.retryDeviceStorage()
    expect(app.deviceStorageError.value).toBe(false)
    expect(JSON.parse(records.get(deviceFields.goalTransactions)!)).toHaveLength(1)
  })

  it('migrates legacy goal savings once without dropping the balance on reload', async () => {
    records.set(deviceFields.goals, JSON.stringify([{ id: 'goal-1', title: 'goal', targetAmount: 1000, savedAmount: 200, priority: 'medium' }]))
    expect(app.loadDeviceData()).toBe(true)
    expect(app.goalTransactions.value).toHaveLength(1)
    expect(app.goals.value[0].savedAmount).toBe(200)
    app = await freshApp()
    expect(app.loadDeviceData()).toBe(true)
    expect(app.goalTransactions.value).toHaveLength(1)
    expect(app.goals.value[0].savedAmount).toBe(200)
  })

  it('keeps unrelated accounts intact when deleting current device data', async () => {
    expect(app.loadDeviceData()).toBe(true)
    records.set('budgetyar-account-local-v1:another-account', 'untouched')
    records.set('budgetyar-account-local-v1:anonymous', 'remove')
    records.set('budgetyar-backup-recovery-v1:anonymous', 'remove')
    app.transactions.value = [{ id: 1, type: 'income', title: 'old', amount: 100, date: '1405/08/26' }]
    app.retryDeviceStorage()
    await app.deleteDeviceAccountData()
    expect(app.transactions.value).toEqual([])
    expect(records.has('budgetyar-account-local-v1:anonymous')).toBe(false)
    expect(records.has('budgetyar-backup-recovery-v1:anonymous')).toBe(false)
    expect(records.get('budgetyar-account-local-v1:another-account')).toBe('untouched')
    expect(app.storageMode.value).toBe('local')
    expect(JSON.parse(records.get(deviceFields.transactions)!)).toEqual([])
  })

  it('does not delete device data when confirmation is cancelled', async () => {
    app.transactions.value = [{ id: 1, type: 'income', title: 'old', amount: 100, date: '1405/08/26' }]
    vi.mocked(window.confirm).mockReturnValue(false)
    await app.deleteDeviceAccountData()
    expect(app.transactions.value).toHaveLength(1)
    expect(records.size).toBe(0)
  })

  it('exports, imports on a fresh device, reloads, and preserves linked ledgers and optional fields', async () => {
    app.transactions.value = [{ id: 1, type: 'expense', title: 'payment', amount: 100, date: '1405/08/26',
      category: 'other', tags: ['tag-test'], sourceType: 'installment', sourceId: '2', installmentIndex: 0 }]
    app.tags.value = [{ key: 'tag-test', label: 'tag', icon: 'x', color: '#fff' }]
    app.installments.value = [{ id: 2, title: 'plan', amount: 100, category: 'other', startDate: '1405/08/26',
      dueDay: 26, totalCount: 3, paidCount: 1, paidIndexes: [0], paymentMethod: 'cash' }]
    app.subscriptions.value = [{ id: 's1', title: 'subscription', endDate: '1405/09/01' }]
    app.creditAdjustments.value = { '1405/08': 30 }
    app.budgets.value = [{ category: 'other', budget: 500 }]
    app.recurringItems.value = [{ id: 'recurring-1', title: 'recurring', type: 'expense', amount: 50,
      frequency: 'monthly', startDate: '1405/09/01', isSubscription: false, isActive: true,
      reminderDaysBefore: 1, skippedDates: ['1405/10/01'], createdAt: '1405/08/26', updatedAt: '1405/08/26' }]
    app.debts.value = [{ id: 'debt-1', title: 'debt', type: 'other', principalAmount: 200,
      remainingAmount: 150, minimumMonthlyPayment: 10, priority: 'medium', isActive: true,
      createdAt: '1405/08/26', updatedAt: '1405/08/26' }]
    const raw = JSON.stringify({ ...JSON.parse(await app.createExportFile('JSON').blob.text()), futureMetadata: { value: 'preserve' } })
    const expected = JSON.parse(raw)
    records.clear()
    app = await freshApp()
    app.confirmDialog.unregisterUi()
    expect(app.loadDeviceData()).toBe(true)
    await app.importBackup({ target: { files: [{ size: raw.length, text: async () => raw }], value: 'backup.json' } } as unknown as Event)
    await nextTick()
    app = await freshApp()
    expect(app.loadDeviceData()).toBe(true)
    const actual = JSON.parse(app.buildBackupJson())
    expect(actual.futureMetadata).toEqual({ value: 'preserve' })
    for (const field of ['transactions', 'categories', 'tags', 'budgets', 'installments', 'subscriptions',
      'creditAdjustments', 'creditLimit', 'goals', 'goalTransactions', 'recurringItems', 'debts', 'incomeSettings', 'deletedDefaultRuleIds']) {
      expect(actual[field], field).toEqual(expected[field])
    }
  })
})
