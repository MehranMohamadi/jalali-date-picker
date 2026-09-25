const COOKIE_NAME = 'budgetyar_account_session'

export interface CloudConfig {
  backendUrl: string
  apiToken: string
}

export function getCloudConfig(): CloudConfig | null {
  const backendUrl = (process.env.BUDGETYAR_BACKEND_URL?.trim() || 'https://jalali-date-picker.vercel.app').replace(/\/+$/, '')
  const apiToken = process.env.BUDGETYAR_API_TOKEN?.trim() ?? ''
  if (!/^https:\/\//.test(backendUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(backendUrl)) return null
  if (apiToken.length < 32) return null
  return { backendUrl, apiToken }
}

export function accountSession(cookieHeader: string | undefined) {
  const token = cookieHeader?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) ?? ''
  return /^[a-f0-9]{64}$/.test(token) ? token : ''
}

export function accountSessionCookie(token: string, maxAge: number, secure: boolean, persistent = true) {
  if (!/^[a-f0-9]{64}$/.test(token) || !Number.isInteger(maxAge) || maxAge < 1 || maxAge > 30 * 24 * 60 * 60) {
    throw new Error('invalid account session')
  }
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/${persistent ? `; Max-Age=${maxAge}` : ''}${secure ? '; Secure' : ''}`
}

export function clearAccountSessionCookie(secure: boolean) {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`
}

export function sameOrigin(origin: string | undefined, host: string | undefined) {
  if (!origin || !host) return false
  try {
    const parsed = new URL(origin)
    return parsed.host === host && (parsed.protocol === 'https:' || parsed.protocol === 'http:' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))
  } catch { return false }
}

export async function proxyBackend(config: CloudConfig, path: '/api/account' | '/api/sync', method: 'GET' | 'POST' | 'PUT', body?: string, sessionToken?: string) {
  const response = await fetch(`${config.backendUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'X-Budgetyar-Session': sessionToken } : {}),
    },
    body,
    signal: AbortSignal.timeout(25000),
  })
  const content = await response.text()
  return {
    status: response.status,
    body: content && response.headers.get('content-type')?.includes('application/json')
      ? content
      : JSON.stringify({ error: 'پاسخ بک‌اند معتبر نیست' }),
  }
}

export function proxyCloudSnapshot(config: CloudConfig, method: 'GET' | 'PUT', sessionToken: string, body?: string) {
  return proxyBackend(config, '/api/sync', method, body, sessionToken)
}
