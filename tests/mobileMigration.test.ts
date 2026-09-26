import { describe, expect, it } from 'vitest'
import { migrateMobileStorage } from '../src/utils/mobileMigration'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial))
  return {
    get length() { return values.size },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
    clear: () => values.clear(),
  }
}

describe('Android origin migration', () => {
  it('preserves finance data and account copies but never imports legacy credentials', () => {
    const storage = memoryStorage()
    migrateMobileStorage(storage, { 'budgetyar-transactions-v1': '[]', 'budgetyar-account-local-v1:a': '{}', 'budgetyar-users-v1': 'secret', 'password': 'secret' })
    expect(storage.getItem('budgetyar-transactions-v1')).toBe('[]')
    expect(storage.getItem('budgetyar-account-local-v1:a')).toBe('{}')
    expect(storage.getItem('budgetyar-users-v1')).toBeNull()
    expect(storage.getItem('password')).toBeNull()
  })
  it('keeps account ownership while requiring an explicit cloud transfer', () => {
    const storage = memoryStorage()
    migrateMobileStorage(storage, { 'budgetyar-cloud-settings-v1': JSON.stringify({ accountId: 'a', version: 17, storageMode: 'cloud', dirty: true, apiToken: 'secret' }) })
    expect(JSON.parse(storage.getItem('budgetyar-cloud-settings-v1')!)).toEqual({ accountId: 'a', version: 0, storageMode: 'local', dirty: false })
  })
  it('rejects conflicting existing data before making any writes', () => {
    const storage = memoryStorage({ 'budgetyar-transactions-v1': '[1]' })
    expect(() => migrateMobileStorage(storage, { 'budgetyar-budgets-v1': '{}', 'budgetyar-transactions-v1': '[2]' })).toThrow('MIGRATION_CONFLICT')
    expect(storage.getItem('budgetyar-budgets-v1')).toBeNull()
    expect(storage.getItem('budgetyar-transactions-v1')).toBe('[1]')
  })
  it('resumes interrupted writes and never reimports stale data after completion', () => {
    const storage = memoryStorage({ 'budgetyar-transactions-v1': '[]' })
    const source = { 'budgetyar-transactions-v1': '[]', 'budgetyar-budgets-v1': '{}' }
    migrateMobileStorage(storage, source)
    storage.setItem('budgetyar-transactions-v1', '[3]')
    migrateMobileStorage(storage, source)
    expect(storage.getItem('budgetyar-transactions-v1')).toBe('[3]')
    expect(storage.getItem('budgetyar-budgets-v1')).toBe('{}')
  })
})
