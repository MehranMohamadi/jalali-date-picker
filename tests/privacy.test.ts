import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  isPluginAvailable: vi.fn(() => false),
  getStatus: vi.fn(),
  setEnabled: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: native, registerPlugin: () => native }))

import { privateFormatter, privateText, usePrivacy } from '../playground/composables/usePrivacy'

describe('device privacy', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
  }
  const privacy = usePrivacy()
  afterEach(() => vi.unstubAllGlobals())

  beforeEach(async () => {
    vi.resetAllMocks()
    values.clear()
    vi.stubGlobal('localStorage', storage)
    native.isNativePlatform.mockReturnValue(false)
    native.isPluginAvailable.mockReturnValue(false)
    storage.getItem.mockImplementation((key) => values.get(key) ?? null)
    storage.setItem.mockImplementation((key, value) => { values.set(key, value) })
    await privacy.start()
  })

  it('persists masking and restores it before showing device values', async () => {
    expect(privacy.amountsHidden.value).toBe(false)
    privacy.toggleAmounts()
    expect(values.get('budgetyar-hide-amounts-v1')).toBe('true')
    expect(privateText('private balance')).toBe('••••')
    await privacy.start()
    expect(privacy.amountsHidden.value).toBe(true)
    privacy.toggleAmounts()
    expect(privateText('visible balance')).toBe('visible balance')
  })

  it('masks display formatters reactively without changing raw formatting or input data', () => {
    const rawFormatter = vi.fn((amount: number, unit = 'toman') => `${amount} ${unit}`)
    const display = privateFormatter(rawFormatter)
    const source = { amount: 1234567 }
    expect(display(source.amount)).toBe('1234567 toman')
    privacy.toggleAmounts()
    rawFormatter.mockClear()
    expect(display(source.amount, 'USD')).toBe('••••')
    expect(rawFormatter).not.toHaveBeenCalled()
    expect(source.amount).toBe(1234567)
    expect(rawFormatter(source.amount)).toBe('1234567 toman')
    privacy.toggleAmounts()
    expect(display(source.amount, 'USD')).toBe('1234567 USD')
  })

  it('keeps masking usable if device storage is blocked', async () => {
    storage.getItem.mockImplementation(() => { throw new Error('blocked') })
    storage.setItem.mockImplementation(() => { throw new Error('blocked') })
    await expect(privacy.start()).resolves.toBeUndefined()
    expect(() => privacy.toggleAmounts()).not.toThrow()
    expect(privacy.amountsHidden.value).toBe(true)
  })

  it('does not offer native locking in browsers or older APKs', async () => {
    expect(privacy.nativeSupported.value).toBe(false)
    native.isNativePlatform.mockReturnValue(true)
    await privacy.refreshLock()
    expect(privacy.nativeSupported.value).toBe(false)
    await privacy.toggleLock()
    expect(native.getStatus).not.toHaveBeenCalled()
    expect(native.setEnabled).not.toHaveBeenCalled()
  })

  it('uses the native lock preference as the authority and waits for authentication', async () => {
    native.isNativePlatform.mockReturnValue(true)
    native.isPluginAvailable.mockReturnValue(true)
    native.getStatus.mockResolvedValue({ enabled: false, available: true })
    await privacy.refreshLock()
    let complete!: (status: { enabled: boolean; available: boolean }) => void
    native.setEnabled.mockImplementation(() => new Promise((resolve) => { complete = resolve }))
    const pending = privacy.toggleLock()
    expect(privacy.busy.value).toBe(true)
    expect(privacy.lockEnabled.value).toBe(false)
    await privacy.toggleLock()
    expect(native.setEnabled).toHaveBeenCalledTimes(1)
    complete({ enabled: true, available: true })
    await pending
    expect(privacy.lockEnabled.value).toBe(true)
    expect(privacy.busy.value).toBe(false)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('preserves an enabled lock when disabling is cancelled', async () => {
    native.isNativePlatform.mockReturnValue(true)
    native.isPluginAvailable.mockReturnValue(true)
    native.getStatus.mockResolvedValue({ enabled: true, available: true })
    await privacy.refreshLock()
    native.setEnabled.mockRejectedValue(new Error('cancelled'))
    await privacy.toggleLock()
    expect(native.setEnabled).toHaveBeenCalledWith({ enabled: false })
    expect(privacy.lockEnabled.value).toBe(true)
    expect(privacy.busy.value).toBe(false)
    expect(privacy.message.value).toContain('تغییر نکرد')
  })
})
