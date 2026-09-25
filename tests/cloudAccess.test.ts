import { afterEach, describe, expect, it, vi } from 'vitest'
import { accountSession, accountSessionCookie, getCloudConfig, proxyCloudSnapshot, sameOrigin } from '../src/server/cloudAccess'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function configuredCloud() {
  vi.stubEnv('BUDGETYAR_BACKEND_URL', 'https://backend.example.test')
  vi.stubEnv('BUDGETYAR_API_TOKEN', 'a'.repeat(32))
  const config = getCloudConfig()
  if (!config) throw new Error('test cloud configuration is invalid')
  return config
}

describe('account cloud access', () => {
  it('requires server-only backend credentials', () => {
    vi.stubEnv('BUDGETYAR_API_TOKEN', '')
    expect(getCloudConfig()).toBeNull()
  })

  it('keeps an opaque account token in an HttpOnly cookie', () => {
    const token = 'b'.repeat(64)
    const cookie = accountSessionCookie(token, 86400, true, false)
    expect(cookie).toContain('HttpOnly; SameSite=Strict')
    expect(cookie).toContain('; Secure')
    expect(cookie).not.toContain('Max-Age=')
    expect(accountSession(cookie)).toBe(token)
    expect(accountSession(cookie.replace(token, 'not-a-token'))).toBe('')
  })

  it('forwards account identity only from the server cookie', async () => {
    const config = configuredCloud()
    const token = 'b'.repeat(64)
    expect(sameOrigin('https://app.example.test', 'app.example.test')).toBe(true)
    expect(sameOrigin('http://app.example.test', 'app.example.test')).toBe(false)

    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetcher)
    expect(await proxyCloudSnapshot(config, 'GET', token)).toEqual({ status: 200, body: '{"version":1}' })
    expect(fetcher).toHaveBeenCalledWith('https://backend.example.test/api/sync', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: `Bearer ${'a'.repeat(32)}`, 'X-Budgetyar-Session': token }),
    }))
  })
})
