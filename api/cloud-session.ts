import type { IncomingMessage, ServerResponse } from 'node:http'
import { getCloudConfig, hasCloudSession, passwordMatches, sameOrigin, sessionCookie } from '../src/server/cloudAccess'

export default async function handler(request: IncomingMessage & { body?: unknown }, response: ServerResponse) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  const config = getCloudConfig()
  if (!config) {
    response.statusCode = 503
    response.end(JSON.stringify({ error: 'اتصال ابری در سرور تنظیم نشده است' }))
    return
  }
  if (request.method === 'GET') {
    response.end(JSON.stringify({ authenticated: hasCloudSession(request.headers.cookie, config) }))
    return
  }
  if (request.method !== 'POST' || !sameOrigin(request.headers.origin, request.headers.host)) {
    response.statusCode = 403
    response.end(JSON.stringify({ error: 'درخواست مجاز نیست' }))
    return
  }
  try {
    let body = request.body
    if (body === undefined) {
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of request) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        size += bytes.length
        if (size > 4096) throw new Error('large body')
        chunks.push(bytes)
      }
      body = Buffer.concat(chunks).toString('utf8')
    }
    const parsed = typeof body === 'string' ? JSON.parse(body) : body
    if (!passwordMatches((parsed as { password?: unknown })?.password, config)) {
      response.statusCode = 401
      response.end(JSON.stringify({ error: 'رمز ورود درست نیست' }))
      return
    }
    const secure = request.headers['x-forwarded-proto'] === 'https' || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(request.headers.host ?? '')
    response.setHeader('Set-Cookie', sessionCookie(config, secure))
    response.end(JSON.stringify({ authenticated: true }))
  } catch {
    response.statusCode = 400
    response.end(JSON.stringify({ error: 'درخواست ورود معتبر نیست' }))
  }
}
