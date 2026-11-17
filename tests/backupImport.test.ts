import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { watch } from 'vue'
import { useBudgetyar } from '../playground/composables/useBudgetyar'
import { BackupImportError, MAX_BACKUP_BYTES, backupRecoveryKey, parseBackupFile } from '../src/utils/backupImport'

describe('backup file envelope', () => {
  const envelope = { app: 'budgetyar', version: 1, transactions: [], categories: [], budgets: [] }

  it.each([
    {}, { ...envelope, transactions: undefined }, { ...envelope, budgets: {} },
    { ...envelope, version: 2 }, { ...envelope, tags: {} }, { ...envelope, creditAdjustments: [] },
    { ...envelope, transactions: [{ id: 1 }, { id: 1 }] },
  ])('rejects malformed or unsupported envelopes', (value) => {
    expect(() => parseBackupFile(JSON.stringify(value))).toThrow(BackupImportError)
  })

  it('accepts legacy optional fields and preserves unknown fields', () => {
    const legacy = { ...envelope, version: undefined, futureMetadata: { enabled: true } }
    expect(parseBackupFile(JSON.stringify(legacy))).toEqual(JSON.parse(JSON.stringify(legacy)))
  })

  it('rejects overflowing numbers and measures UTF-8 bytes', () => {
    expect(() => parseBackupFile(JSON.stringify(envelope).replace('"version":1', '"version":1,"creditLimit":1e400'))).toThrow(BackupImportError)
    expect(() => parseBackupFile('ی'.repeat(MAX_BACKUP_BYTES / 2 + 1))).toThrow(BackupImportError)
  })

  it('keeps recovery files separate for different accounts and guests', () => {
    expect(new Set(['', 'user-a', 'user-b'].map(backupRecoveryKey)).size).toBe(3)
  })
})

describe('backup import safety', () => {
  const app = useBudgetyar()
  let saved: Map<string, string>

  beforeEach(() => {
    app.confirmDialog.unregisterUi()
    app.transactions.value = [{ id: 1, title: 'original', type: 'income', amount: 100, date: '1405/08/26' }]
    app.toasts.value = []
    saved = new Map()
    vi.stubGlobal('window', { confirm: vi.fn(() => true), setTimeout: vi.fn() })
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => saved.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => saved.set(key, value)),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  function selectFile(backup: unknown, size?: number) {
    const raw = JSON.stringify(backup)
    const file = { size: size ?? new TextEncoder().encode(raw).byteLength, text: vi.fn(async () => raw) }
    const input = { files: [file], value: 'backup.json' }
    return { input, file, event: { target: input } as unknown as Event }
  }

  function validBackup() {
    return { ...JSON.parse(app.buildBackupJson()), transactions: [{ id: 2, title: 'imported', type: 'expense', amount: 50, date: '1405/08/25' }] }
  }

  it('rejects an oversized file before reading it', async () => {
    const selected = selectFile({}, MAX_BACKUP_BYTES + 1)
    await app.importBackup(selected.event)
    expect(selected.file.text).not.toHaveBeenCalled()
    expect(window.confirm).not.toHaveBeenCalled()
    expect(selected.input.value).toBe('')
  })

  it.each([
    () => ({ app: 'budgetyar' }),
    () => ({ ...validBackup(), transactions: [{ id: 2 }] }),
    () => ({ ...validBackup(), transactions: [{ ...validBackup().transactions[0], amount: -1 }] }),
    () => ({ ...validBackup(), transactions: [{ ...validBackup().transactions[0], date: '1405/12/30' }] }),
    () => ({ ...validBackup(), subscriptions: [{ id: 'bad' }] }),
    () => ({ ...validBackup(), categories: [] }),
    () => ({ ...validBackup(), creditAdjustments: { invalid: 500 } }),
  ])('leaves existing data untouched when records are invalid', async (build) => {
    const before = app.buildBackupJson()
    await app.importBackup(selectFile(build()).event)
    expect(JSON.parse(app.buildBackupJson())).toMatchObject({ transactions: JSON.parse(before).transactions })
    expect(window.confirm).not.toHaveBeenCalled()
    expect(saved.size).toBe(0)
  })

  it('cancels without changing data or replacing the recovery file', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    saved.set(backupRecoveryKey(''), 'previous recovery')
    await app.importBackup(selectFile(validBackup()).event)
    expect(app.transactions.value[0].title).toBe('original')
    expect(saved.get(backupRecoveryKey(''))).toBe('previous recovery')
  })

  it('aborts without changes when the recovery file cannot be saved', async () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('QuotaExceededError') })
    await app.importBackup(selectFile(validBackup()).event)
    expect(app.transactions.value[0].title).toBe('original')
    expect(app.toasts.value.at(-1)?.text).toContain('بازیابی انجام نشد')
  })

  it('saves a complete previous backup and shows a summary before replacement', async () => {
    const previous = JSON.parse(app.buildBackupJson())
    await app.importBackup(selectFile(validBackup()).event)
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('۱ تراکنش'))
    expect(JSON.parse(saved.get(backupRecoveryKey(''))!)).toMatchObject({
      transactions: previous.transactions, subscriptions: previous.subscriptions,
      tags: previous.tags, creditAdjustments: previous.creditAdjustments,
      goalTransactions: previous.goalTransactions,
    })
    expect(app.transactions.value[0].title).toBe('imported')
    expect(app.backupImportBusy.value).toBe(false)
  })

  it('rejects a stale confirmation if finance data changes while it is open', async () => {
    vi.mocked(window.confirm).mockImplementation(() => {
      app.transactions.value.push({ id: 3, title: 'new', type: 'income', amount: 1, date: '1405/08/26' })
      return true
    })
    await app.importBackup(selectFile(validBackup()).event)
    expect(app.transactions.value.map((item) => item.id)).toEqual([1, 3])
    expect(saved.size).toBe(0)
  })

  it('restores in-memory data and avoids success when a persistence watcher fails', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stop = watch(app.transactions, (value) => {
      if (value[0]?.title === 'imported') throw new Error('QuotaExceededError')
    })
    try {
      await app.importBackup(selectFile(validBackup()).event)
      expect(app.transactions.value[0].title).toBe('original')
      expect(JSON.parse(saved.get(backupRecoveryKey(''))!).transactions[0].title).toBe('original')
      expect(app.toasts.value.at(-1)?.text).toContain('ناموفق بود')
      expect(app.toasts.value.some((item) => item.text.includes('✅'))).toBe(false)
    } finally {
      stop()
      warning.mockRestore()
    }
  })

  it('ignores a second import while a file is being read', async () => {
    let finishRead!: (raw: string) => void
    const first = selectFile(validBackup())
    first.file.text.mockImplementation(() => new Promise((resolve) => { finishRead = resolve }))
    const pending = app.importBackup(first.event)
    const second = selectFile(validBackup())
    await app.importBackup(second.event)
    expect(second.file.text).not.toHaveBeenCalled()
    finishRead(JSON.stringify(validBackup()))
    await pending
    expect(window.confirm).toHaveBeenCalledOnce()
  })
})
