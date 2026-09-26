import storageKeys from '../../mobile/storage-keys.json'

const marker = 'budgetyar-origin-migration-v1'
const allowed = (key: string) => storageKeys.includes(key) || key.startsWith('budgetyar-account-local-v1:')

// Called before any finance state is initialized. Retrying a partial write is safe.
export function migrateMobileStorage(storage: Storage, source: Record<string, unknown>) {
  if (storage.getItem(marker) === 'complete') return
  const entries = Object.entries(source).filter(([key, value]) => allowed(key) && typeof value === 'string') as [string, string][]
  for (const entry of entries) {
    if (entry[0] === 'budgetyar-cloud-settings-v1') {
      let config: Record<string, unknown> = {}
      try { config = JSON.parse(entry[1]) || {} } catch { /* Restore local-only defaults. */ }
      entry[1] = JSON.stringify({ accountId: typeof config.accountId === 'string' ? config.accountId : '', version: 0, storageMode: 'local', dirty: false })
    }
  }
  // Do not combine two origins' financial datasets or partially overwrite a conflict.
  const incoming = new Map(entries)
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)!
    if (allowed(key) && storage.getItem(key) !== incoming.get(key)) throw new Error('MIGRATION_CONFLICT')
  }
  for (const [key, value] of entries) storage.setItem(key, value)
  storage.setItem(marker, 'complete')
}
