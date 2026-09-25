import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCloudConfig,
  hasCloudSession,
  passwordMatches,
  proxyCloudSnapshot,
  sameOrigin,
  sessionCookie,
} from '../src/server/cloudAccess'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function configuredCloud() {
  vi.stubEnv('BUDGETYAR_BACKEND_URL', 'https://backend.example.test')
  vi.stubEnv('BUDGETYAR_API_TOKEN', 'a'.repeat(32))
  vi.stubEnv('BUDGETYAR_CLOUD_PASSWORD', 'a-private-password')
  vi.stubEnv('BUDGETYAR_SESSION_SECRET', 'b'.repeat(32))
  const config = getCloudConfig()
  if (!config) throw new Error('test cloud configuration is invalid')
  return config
}

describe('cloud access', () => {
  it('requires complete server configuration', () => {
    vi.stubEnv('BUDGETYAR_BACKEND_URL', 'https://backend.example.test')
    vi.stubEnv('BUDGETYAR_API_TOKEN', '')
    expect(getCloudConfig()).toBeNull()
  })

  it('checks the password and rejects modified session cookies', () => {
    const config = configuredCloud()
    expect(passwordMatches('a-private-password', config)).toBe(true)
    expect(passwordMatches('wrong-password', config)).toBe(false)

    const cookie = sessionCookie(config, true)
    const value = cookie.split(';')[0]
    expect(cookie).toContain('HttpOnly; SameSite=Strict')
    expect(cookie).toContain('; Secure')
    expect(hasCloudSession(value, config)).toBe(true)
    expect(hasCloudSession(`${value.slice(0, -1)}${value.endsWith('0') ? '1' : '0'}`, config)).toBe(false)
  })

  it('accepts only requests from the same host and forwards the token on the server', async () => {
    const config = configuredCloud()
    expect(sameOrigin('https://app.example.test', 'app.example.test')).toBe(true)
    expect(sameOrigin('https://other.example.test', 'app.example.test')).toBe(false)

    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetcher)
    expect(await proxyCloudSnapshot(config, 'GET')).toEqual({ status: 200, body: '{"version":1}' })
    expect(fetcher).toHaveBeenCalledWith('https://backend.example.test/api/sync', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: `Bearer ${'a'.repeat(32)}` }),
    }))
  })
})
