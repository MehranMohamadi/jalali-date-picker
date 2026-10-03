import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleBillingRequest } from '../src/server/billingApi'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

function configure() {
  vi.stubEnv('BUDGETYAR_BACKEND_URL', 'https://backend.example.test')
  vi.stubEnv('BUDGETYAR_API_TOKEN', 'a'.repeat(32))
}

describe('billing proxy', () => {
  it('requires a session for both reads and writes', async () => {
    configure()
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    expect((await handleBillingRequest({ method: 'GET' })).status).toBe(401)
    expect((await handleBillingRequest({ method: 'POST', body: '{}' })).status).toBe(401)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects cross-origin payment writes', async () => {
    configure()
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const result = await handleBillingRequest({ method: 'POST', origin: 'https://evil.example.test', host: 'app.example.test', cookie: `budgetyar_account_session=${'b'.repeat(64)}`, body: '{"action":"start-test"}' })
    expect(result.status).toBe(403)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('forwards only the server-held session to the backend', async () => {
    configure()
    const token = 'b'.repeat(64)
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ plan: 'free', subscription: null, entitlements: ['core'], plans: [] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetcher)
    const result = await handleBillingRequest({ method: 'GET', cookie: `budgetyar_account_session=${token}` })
    expect(result.status).toBe(200)
    expect(fetcher).toHaveBeenCalledWith('https://backend.example.test/api/billing', expect.objectContaining({ headers: expect.objectContaining({ 'X-Budgetyar-Session': token, Authorization: `Bearer ${'a'.repeat(32)}` }) }))
    expect(result.body).not.toContain(token)
  })
})
