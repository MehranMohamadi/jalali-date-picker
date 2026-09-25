import { accountSession, accountSessionCookie, clearAccountSessionCookie, getCloudConfig, proxyBackend, sameOrigin } from './cloudAccess.js'

interface AccountRequest {
  method?: string
  origin?: string
  host?: string
  cookie?: string
  secure: boolean
  body?: string
}

interface AccountResponse {
  status: number
  body: string
  setCookie?: string
}

function json(status: number, value: unknown, setCookie?: string): AccountResponse {
  return { status, body: JSON.stringify(value), setCookie }
}

export async function handleAccountRequest(request: AccountRequest): Promise<AccountResponse> {
  const config = getCloudConfig()
  if (!config) return json(503, { error: 'اتصال ابری در سرور تنظیم نشده است' })
  const session = accountSession(request.cookie)
  if (request.method === 'GET') {
    if (!session) return json(200, { authenticated: false })
    try {
      const result = await proxyBackend(config, '/api/account', 'GET', undefined, session)
      if (result.status === 401) return json(200, { authenticated: false }, clearAccountSessionCookie(request.secure))
      if (result.status !== 200) return { status: result.status, body: result.body }
      const parsed = JSON.parse(result.body) as { user?: unknown }
      return json(200, { authenticated: true, user: parsed.user })
    } catch {
      return json(502, { error: 'ارتباط با بک‌اند برقرار نشد' })
    }
  }
  if (request.method !== 'POST') return json(405, { error: 'روش درخواست مجاز نیست' })
  if (!sameOrigin(request.origin, request.host)) return json(403, { error: 'درخواست مجاز نیست' })
  if (!request.body || Buffer.byteLength(request.body) > 8192) return json(400, { error: 'درخواست معتبر نیست' })
  let action: string
  let remember = false
  try {
    const parsed = JSON.parse(request.body) as { action?: unknown, remember?: unknown }
    action = typeof parsed.action === 'string' ? parsed.action : ''
    remember = parsed.remember === true
  } catch {
    return json(400, { error: 'درخواست معتبر نیست' })
  }
  if (!['register', 'login', 'logout', 'profile', 'password', 'delete'].includes(action)) return json(400, { error: 'عملیات نامعتبر است' })
  if (!['register', 'login'].includes(action) && !session) return json(401, { error: 'ابتدا وارد حساب شوید' })
  try {
    const result = await proxyBackend(config, '/api/account', 'POST', request.body, session)
    if (result.status < 200 || result.status >= 300) return { status: result.status, body: result.body }
    const parsed = JSON.parse(result.body) as { user?: unknown, sessionToken?: string, maxAge?: number, ok?: boolean }
    if (action === 'login' || action === 'register') {
      if (!parsed.sessionToken || !parsed.maxAge || !parsed.user) return json(502, { error: 'پاسخ ورود معتبر نیست' })
      return json(result.status, { authenticated: true, user: parsed.user }, accountSessionCookie(parsed.sessionToken, parsed.maxAge, request.secure, remember))
    }
    if (action === 'logout' || action === 'delete') return json(200, { ok: true }, clearAccountSessionCookie(request.secure))
    return json(200, parsed)
  } catch {
    return json(502, { error: 'ارتباط با بک‌اند برقرار نشد' })
  }
}
