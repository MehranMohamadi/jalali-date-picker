import { accountSession, getCloudConfig, proxyCloudSnapshot, sameOrigin } from '../../../src/server/cloudAccess'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const config = getCloudConfig()
  if (!config) {
    setResponseStatus(event, 503)
    return { error: 'اتصال ابری در سرور تنظیم نشده است' }
  }
  const session = accountSession(getHeader(event, 'cookie'))
  if (!session) {
    setResponseStatus(event, 401)
    return { error: 'ابتدا با رمز وارد شوید' }
  }
  if (event.method !== 'GET' && event.method !== 'PUT') {
    setResponseStatus(event, 405)
    return { error: 'روش درخواست مجاز نیست' }
  }
  if (event.method === 'PUT' && !sameOrigin(getHeader(event, 'origin'), getHeader(event, 'host'))) {
    setResponseStatus(event, 403)
    return { error: 'درخواست مجاز نیست' }
  }
  try {
    const body = event.method === 'PUT' ? await readRawBody(event) : undefined
    if (body && Buffer.byteLength(body) > 2 << 20) {
      setResponseStatus(event, 413)
      return { error: 'حجم داده بیش از حد مجاز است' }
    }
    const result = await proxyCloudSnapshot(config, event.method, session, body)
    setResponseStatus(event, result.status)
    return JSON.parse(result.body)
  } catch {
    setResponseStatus(event, 502)
    return { error: 'ارتباط با بک‌اند برقرار نشد' }
  }
})
