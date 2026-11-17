export const MAX_BACKUP_BYTES = 10 * 1024 * 1024

export class BackupImportError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

const collectionKeys = {
  transactions: 'id', categories: 'key', tags: 'key', budgets: 'category',
  installments: 'id', goals: 'id', subscriptions: 'id', goalTransactions: 'id',
  recurringItems: 'id', debts: 'id', categorizationRules: 'id',
} as const

export function backupRecoveryKey(accountId: string) {
  return `budgetyar-backup-recovery-v1:${accountId || 'anonymous'}`
}

export function parseBackupFile(raw: string): Record<string, unknown> {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) {
    throw new BackupImportError('‏حجم فایل پشتیبان باید حداکثر ۱۰ مگابایت باشد.')
  }
  let value: unknown
  try { value = JSON.parse(raw) } catch {
    throw new BackupImportError('‏فایل پشتیبان قابل خواندن نیست.')
  }
  if (!isRecord(value) || value.app !== 'budgetyar') {
    throw new BackupImportError('‏این فایل پشتیبان بودجه‌یار نیست.')
  }
  // Early backups may omit the version; newer schemas must not be downgraded.
  if (value.version !== undefined && value.version !== 1) {
    throw new BackupImportError('‏نسخهٔ این فایل پشتیبان پشتیبانی نمی‌شود.')
  }
  for (const key of ['transactions', 'categories', 'budgets']) {
    if (!Array.isArray(value[key])) throw new BackupImportError('‏فایل پشتیبان ناقص است؛ اطلاعات فعلی حفظ شد.')
  }
  for (const [key, idKey] of Object.entries(collectionKeys)) {
    const items = value[key]
    if (items === undefined) continue
    if (!Array.isArray(items)) throw new BackupImportError('‏ساختار فایل پشتیبان معتبر نیست.')
    const ids = new Set<unknown>()
    for (const item of items) {
      if (!isRecord(item) || !['string', 'number'].includes(typeof item[idKey])
        || item[idKey] === '' || ids.has(item[idKey])) {
        throw new BackupImportError('‏فایل پشتیبان رکورد نامعتبر یا تکراری دارد.')
      }
      ids.add(item[idKey])
    }
  }
  for (const key of ['incomeSettings', 'creditAdjustments', 'summary']) {
    if (value[key] !== undefined && !isRecord(value[key])) {
      throw new BackupImportError('‏ساختار فایل پشتیبان معتبر نیست.')
    }
  }
  // JSON permits overflowing numeric literals such as 1e400.
  const pending: unknown[] = [value]
  while (pending.length) {
    const item = pending.pop()
    if (typeof item === 'number' && (!Number.isFinite(item) || Math.abs(item) > Number.MAX_SAFE_INTEGER)) {
      throw new BackupImportError('‏فایل پشتیبان عدد خارج از محدودهٔ مجاز دارد.')
    }
    if (item && typeof item === 'object') {
      for (const child of Object.values(item)) pending.push(child)
    }
  }
  return value
}
