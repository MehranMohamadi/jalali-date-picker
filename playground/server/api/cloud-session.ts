import { getCloudConfig, hasCloudSession, passwordMatches, sameOrigin, sessionCookie } from '../../../src/server/cloudAccess'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const config = getCloudConfig()
  if (!config) {
    setResponseStatus(event, 503)
    return { error: 'اتصال ابری در سرور تنظیم نشده است' }
  }
  if (event.method === 'GET') return { authenticated: hasCloudSession(getHeader(event, 'cookie'), config) }
  if (event.method !== 'POST' || !sameOrigin(getHeader(event, 'origin'), getHeader(event, 'host'))) {
    setResponseStatus(event, 403)
    return { error: 'درخواست مجاز نیست' }
  }
  try {
    const body = await readBody<{ password?: unknown }>(event)
    if (!passwordMatches(body?.password, config)) {
      setResponseStatus(event, 401)
      return { error: 'رمز ورود درست نیست' }
    }
    const host = getHeader(event, 'host') ?? ''
    const secure = getHeader(event, 'x-forwarded-proto') === 'https' || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
    appendHeader(event, 'Set-Cookie', sessionCookie(config, secure))
    return { authenticated: true }
  } catch {
    setResponseStatus(event, 400)
    return { error: 'درخواست ورود معتبر نیست' }
  }
})
