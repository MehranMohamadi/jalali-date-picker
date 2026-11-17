import { describe, expect, it } from 'vitest'
import { DEVICE_JOURNAL_KEY, DEVICE_SCHEMA_KEY, deviceFields, readDeviceRecord, recoverDeviceWrite, writeDeviceBatch } from '../src/utils/deviceStorage'

function memoryStorage(initial: Array<[string, string]> = []) {
  const values = new Map(initial)
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

describe('device write recovery', () => {
  const transactions = deviceFields.transactions
  const installments = deviceFields.installments

  it('commits linked finance collections together and removes the journal', () => {
    const store = memoryStorage([[transactions, 'old']])
    writeDeviceBatch(store, [[transactions, 'new'], [installments, 'paid']])
    expect([...store.values]).toEqual([[transactions, 'new'], [installments, 'paid']])
  })

  it('leaves all original values when a later write fails', () => {
    const store = memoryStorage([[transactions, 'old']])
    const original = store.setItem
    store.setItem = (key, value) => {
      if (key === installments) throw new Error('quota')
      original(key, value)
    }
    expect(() => writeDeviceBatch(store, [[transactions, 'new'], [installments, 'paid']])).toThrow('quota')
    expect([...store.values]).toEqual([[transactions, 'old']])
  })

  it('does not write finance values when the journal itself cannot be saved', () => {
    const store = memoryStorage([[transactions, 'old']])
    store.setItem = () => { throw new Error('denied') }
    expect(() => writeDeviceBatch(store, [[transactions, 'new']])).toThrow('denied')
    expect(store.getItem(transactions)).toBe('old')
  })

  it('recovers an interrupted migration before reading any finance values', () => {
    const store = memoryStorage([
      [transactions, '[{"id":2}]'], [installments, '[]'],
      [DEVICE_JOURNAL_KEY, JSON.stringify({ version: 1, before: [[transactions, '[{"id":1}]'], [installments, null]] })],
    ])
    const record = readDeviceRecord(store, { installments: ['default'] })
    expect(record.transactions).toEqual([{ id: 1 }])
    expect(record.installments).toEqual(['default'])
    expect(store.getItem(DEVICE_JOURNAL_KEY)).toBeNull()
  })

  it('keeps the undo journal when recovery is still blocked, and retries it later', () => {
    const store = memoryStorage([
      [transactions, 'new'],
      [DEVICE_JOURNAL_KEY, JSON.stringify({ version: 1, before: [[transactions, 'old']] })],
    ])
    const original = store.setItem
    store.setItem = () => { throw new Error('denied') }
    expect(() => recoverDeviceWrite(store)).toThrow('denied')
    expect(store.getItem(DEVICE_JOURNAL_KEY)).not.toBeNull()
    store.setItem = original
    recoverDeviceWrite(store)
    expect(store.getItem(transactions)).toBe('old')
  })

  it.each([
    '{', JSON.stringify({ version: 2, before: [] }),
    JSON.stringify({ version: 1, before: [['unrelated-secret', 'tampered']] }),
  ])('preserves an invalid journal without modifying other keys', (raw) => {
    const store = memoryStorage([[transactions, 'old'], [DEVICE_JOURNAL_KEY, raw]])
    expect(() => recoverDeviceWrite(store)).toThrow()
    expect(store.getItem(transactions)).toBe('old')
    expect(store.getItem(DEVICE_JOURNAL_KEY)).toBe(raw)
  })

  it('rejects a future schema instead of falling back to empty data', () => {
    const store = memoryStorage([[DEVICE_SCHEMA_KEY, '2']])
    expect(() => readDeviceRecord(store, {})).toThrow('Unsupported device schema')
    expect(store.getItem(DEVICE_SCHEMA_KEY)).toBe('2')
  })
})
