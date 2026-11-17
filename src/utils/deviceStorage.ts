export const DEVICE_JOURNAL_KEY = 'budgetyar-device-write-v1'
export const DEVICE_SCHEMA_KEY = 'budgetyar-device-schema-v1'

export const deviceFields = {
  transactions: 'budgetyar-transactions-v1', categories: 'budgetyar-categories-v1',
  tags: 'budgetyar-tags-v1', budgets: 'budgetyar-budgets-v1',
  creditLimit: 'budgetyar-credit-limit-v1', creditAdjustments: 'budgetyar-credit-adjustments-v1',
  installments: 'budgetyar-installments-v1', subscriptions: 'budgetyar-subscriptions-v1',
  goals: 'budgetyar-goals-v1', goalTransactions: 'budgetyar-goal-transactions-v1',
  recurringItems: 'budgetyar-recurring-items-v1', debts: 'budgetyar-debts-v1',
  categorizationRules: 'budgetyar-categorization-rules-v1', incomeSettings: 'budgetyar-income-settings-v1',
  deletedDefaultRuleIds: 'budgetyar-deleted-default-categorization-rules-v1',
  snapshotExtras: 'budgetyar-snapshot-extra-v1',
} as const

type DeviceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const allowedKeys = new Set<string>([...Object.values(deviceFields), DEVICE_SCHEMA_KEY,
  'budgetyar-theme-v1', 'budgetyar-cloud-settings-v1'])
const allowed = (key: string) => allowedKeys.has(key) || key.startsWith('budgetyar-account-local-v1:') || key.startsWith('budgetyar-backup-recovery-v1:')

/** An undo journal stays durable until every member of the batch is written. */
export function recoverDeviceWrite(storage: DeviceStorage) {
  const raw = storage.getItem(DEVICE_JOURNAL_KEY)
  if (raw === null) return
  const journal: unknown = JSON.parse(raw)
  if (!journal || typeof journal !== 'object' || !('version' in journal) || journal.version !== 1
    || !('before' in journal) || !Array.isArray(journal.before)
    || !journal.before.every((entry: unknown) => Array.isArray(entry) && entry.length === 2
      && typeof entry[0] === 'string' && allowed(entry[0]) && (entry[1] === null || typeof entry[1] === 'string'))) {
    throw new Error('Invalid device recovery journal')
  }
  for (const [key, value] of journal.before as Array<[string, string | null]>) {
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  }
  storage.removeItem(DEVICE_JOURNAL_KEY)
}

export function writeDeviceBatch(storage: DeviceStorage, values: Array<[string, string | null]>) {
  if (!values.every(([key]) => allowed(key))) throw new Error('Invalid device storage key')
  recoverDeviceWrite(storage)
  const unique = [...new Map(values)]
  const changed = unique.map(([key, value]) => ({ key, value, before: storage.getItem(key) }))
    .filter((entry) => entry.before !== entry.value)
  if (!changed.length) return
  storage.setItem(DEVICE_JOURNAL_KEY, JSON.stringify({ version: 1, before: changed.map(({ key, before }) => [key, before]) }))
  try {
    for (const { key, value } of changed) {
      if (value === null) storage.removeItem(key)
      else storage.setItem(key, value)
    }
    storage.removeItem(DEVICE_JOURNAL_KEY)
  } catch (error) {
    try { recoverDeviceWrite(storage) } catch { /* Startup must finish recovery before loading. */ }
    throw error
  }
}

export function readDeviceRecord(storage: DeviceStorage, defaults: Record<string, unknown>) {
  recoverDeviceWrite(storage)
  const schema = storage.getItem(DEVICE_SCHEMA_KEY)
  if (schema !== null && schema !== '1') throw new Error('Unsupported device schema')
  const record = { ...defaults }
  for (const [field, key] of Object.entries(deviceFields)) {
    const raw = storage.getItem(key)
    if (raw !== null) record[field] = JSON.parse(raw)
  }
  const extras = record.snapshotExtras
  if (extras !== undefined && (!extras || typeof extras !== 'object' || Array.isArray(extras))) throw new Error('Invalid snapshot metadata')
  return { ...(extras as Record<string, unknown> | undefined), ...record }
}
