import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'budgetyar_cloud_session'
const SESSION_AGE_SECONDS = 30 * 24 * 60 * 60

interface CloudConfig {
  backendUrl: string
  apiToken: string
  password: string
  sessionSecret: string
}

export function getCloudConfig(): CloudConfig | null {
  const backendUrl = (process.env.BUDGETYAR_BACKEND_URL?.trim() || 'https://jalali-date-picker.vercel.app').replace(/\/+$/, '')
  const apiToken = process.env.BUDGETYAR_API_TOKEN?.trim() ?? ''
  const password = process.env.BUDGETYAR_CLOUD_PASSWORD ?? ''
  const sessionSecret = process.env.BUDGETYAR_SESSION_SECRET ?? ''
  if (!/^https:\/\//.test(backendUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(backendUrl)) return null
  if (apiToken.length < 32 || password.length < 16 || sessionSecret.length < 32) return null
  return { backendUrl, apiToken, password, sessionSecret }
}

function cookieValue(header: string | undefined) {
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) ?? ''
}

function signature(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('hex')
}

export function hasCloudSession(cookieHeader: string | undefined, config: CloudConfig) {
  const [expires, nonce, received] = cookieValue(cookieHeader).split('.')
  if (!expires || !nonce || !received || !/^\d+$/.test(expires) || Number(expires) <= Date.now()) return false
  const expected = Buffer.from(signature(`${expires}.${nonce}`, config.sessionSecret), 'hex')
  const actual = Buffer.from(received, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function passwordMatches(value: unknown, config: CloudConfig) {
  if (typeof value !== 'string') return false
  const expected = createHash('sha256').update(config.password).digest()
  const actual = createHash('sha256').update(value).digest()
  return timingSafeEqual(actual, expected)
}

export function sessionCookie(config: CloudConfig, secure: boolean) {
  const expires = String(Date.now() + SESSION_AGE_SECONDS * 1000)
  const nonce = randomBytes(16).toString('hex')
  const value = `${expires}.${nonce}.${signature(`${expires}.${nonce}`, config.sessionSecret)}`
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_AGE_SECONDS}${secure ? '; Secure' : ''}`
}

export function sameOrigin(origin: string | undefined, host: string | undefined) {
  if (!origin || !host) return false
  try { return new URL(origin).host === host } catch { return false }
}

export async function proxyCloudSnapshot(config: CloudConfig, method: 'GET' | 'PUT', body?: string) {
  const response = await fetch(`${config.backendUrl}/api/sync`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
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
