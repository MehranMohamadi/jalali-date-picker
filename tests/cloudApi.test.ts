import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { nativeRequest } = vi.hoisted(() => ({ nativeRequest: vi.fn() }))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
  registerPlugin: () => ({ request: nativeRequest }),
}))
import { requestCloudApi } from '../playground/composables/cloudApi'

beforeEach(() => nativeRequest.mockReset())
afterEach(() => vi.unstubAllGlobals())

describe('Android account transport', () => {
  it('uses the hosted page cookie session for account and cloud requests', async () => {
    vi.stubGlobal('window', { location: { protocol: 'https:', hostname: 'app.example.test' } })
    const fetcher = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetcher)
    await requestCloudApi('/api/account', { method: 'POST', body: '{}' })
    await requestCloudApi('/api/cloud-sync')
    expect(nativeRequest).not.toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledWith('/api/account', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store', method: 'POST' }))
    expect(fetcher).toHaveBeenCalledWith('/api/cloud-sync', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }))
  })

  it('keeps the native account proxy for an older bundled shell', async () => {
    vi.stubGlobal('window', { location: { protocol: 'https:', hostname: 'localhost' } })
    nativeRequest.mockResolvedValue({ status: 200, data: { authenticated: true } })
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const result = await requestCloudApi('/api/account')
    expect(await result.json()).toEqual({ authenticated: true })
    expect(fetcher).not.toHaveBeenCalled()
    expect(nativeRequest).toHaveBeenCalledWith({ path: '/api/account', method: 'GET', body: undefined })
  })
})
