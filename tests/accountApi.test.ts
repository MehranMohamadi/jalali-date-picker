import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleAccountRequest } from '../src/server/accountApi'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function configure() {
  vi.stubEnv('BUDGETYAR_BACKEND_URL', 'https://backend.example.test')
  vi.stubEnv('BUDGETYAR_API_TOKEN', 'a'.repeat(32))
}

describe('account proxy', () => {
  it('rejects cross-origin writes before calling the backend', async () => {
    configure()
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const result = await handleAccountRequest({
      method: 'POST', origin: 'https://evil.example.test', host: 'app.example.test', secure: true,
      body: JSON.stringify({ action: 'login', username: 'alice', password: 'a password' }),
    })
    expect(result.status).toBe(403)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('sets an HttpOnly cookie and never returns the session token in JSON', async () => {
    configure()
    const token = 'b'.repeat(64)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      user: { id: 'user-a', username: 'alice', fullName: 'Alice' }, sessionToken: token, maxAge: 86400,
    }), { status: 201, headers: { 'content-type': 'application/json' } })))
    const result = await handleAccountRequest({
      method: 'POST', origin: 'https://app.example.test', host: 'app.example.test', secure: true,
      body: JSON.stringify({ action: 'register', username: 'alice', password: 'a sufficiently long password' }),
    })
    expect(result.status).toBe(201)
    expect(result.setCookie).toContain(`budgetyar_account_session=${token}; HttpOnly`)
    expect(result.body).not.toContain(token)
    expect(JSON.parse(result.body)).toMatchObject({ authenticated: true, user: { id: 'user-a' } })
  })
})
