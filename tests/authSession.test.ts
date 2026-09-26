import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('../playground/composables/cloudApi', () => ({ requestCloudApi: request }))

const user = { id: 'account-a', username: 'alice', fullName: 'Alice', createdAt: '2026-01-01' }
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })

beforeEach(() => {
  vi.resetModules()
  request.mockReset()
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
})
afterEach(() => vi.unstubAllGlobals())

describe('shared account session', () => {
  it('deduplicates simultaneous account and cloud session checks', async () => {
    let finish!: (value: Response) => void
    request.mockReturnValue(new Promise<Response>(resolve => { finish = resolve }))
    const { useAuth } = await import('../playground/composables/useAuth')
    const account = useAuth()
    const cloud = useAuth()
    const checks = [account.refreshAuth(), cloud.refreshAuth()]
    expect(request).toHaveBeenCalledTimes(1)
    finish(response({ authenticated: true, user }))
    await Promise.all(checks)
    expect(account.currentUser.value).toEqual(user)
    expect(cloud.currentUser.value).toEqual(user)
  })

  it('ignores an old anonymous response arriving after successful login', async () => {
    let finish!: (value: Response) => void
    request.mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve }))
    request.mockResolvedValueOnce(response({ authenticated: true, user }))
    const { useAuth } = await import('../playground/composables/useAuth')
    const auth = useAuth()
    const oldCheck = auth.refreshAuth()
    expect((await auth.login('alice', 'test-password')).success).toBe(true)
    finish(response({ authenticated: false }))
    await oldCheck
    expect(auth.currentUser.value).toEqual(user)
  })

  it('retains the signed-in user on connection failure and clears an expired session', async () => {
    request.mockResolvedValueOnce(response({ authenticated: true, user }))
    const { useAuth } = await import('../playground/composables/useAuth')
    const auth = useAuth()
    await auth.refreshAuth()
    request.mockRejectedValueOnce(new Error('offline'))
    await expect(auth.refreshAuth()).rejects.toThrow('offline')
    expect(auth.currentUser.value).toEqual(user)
    request.mockResolvedValueOnce(response({ authenticated: false }))
    await auth.refreshAuth()
    expect(auth.currentUser.value).toBeNull()
  })

  it('does not restore a stale user after logout', async () => {
    let finish!: (value: Response) => void
    request.mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve }))
    request.mockResolvedValueOnce(response({ ok: true }))
    const { useAuth } = await import('../playground/composables/useAuth')
    const auth = useAuth()
    const oldCheck = auth.refreshAuth()
    await auth.logout()
    finish(response({ authenticated: true, user }))
    await oldCheck
    expect(auth.currentUser.value).toBeNull()
  })
})
