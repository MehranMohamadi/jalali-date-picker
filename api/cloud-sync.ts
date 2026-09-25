import type { IncomingMessage, ServerResponse } from 'node:http'
import { getCloudConfig, hasCloudSession, proxyCloudSnapshot, sameOrigin } from '../src/server/cloudAccess.js'

export default async function handler(request: IncomingMessage & { body?: unknown }, response: ServerResponse) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  const config = getCloudConfig()
  if (!config) {
    response.statusCode = 503
    response.end(JSON.stringify({ error: 'اتصال ابری در سرور تنظیم نشده است' }))
    return
  }
  if (!hasCloudSession(request.headers.cookie, config)) {
    response.statusCode = 401
    response.end(JSON.stringify({ error: 'ابتدا با رمز وارد شوید' }))
    return
  }
  if (request.method !== 'GET' && request.method !== 'PUT') {
    response.statusCode = 405
    response.setHeader('Allow', 'GET, PUT')
    response.end(JSON.stringify({ error: 'روش درخواست مجاز نیست' }))
    return
  }
  if (request.method === 'PUT' && !sameOrigin(request.headers.origin, request.headers.host)) {
    response.statusCode = 403
    response.end(JSON.stringify({ error: 'درخواست مجاز نیست' }))
    return
  }
  try {
    let body: string | undefined
    if (request.method === 'PUT') {
      if (request.body !== undefined) body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
      else {
        const chunks: Buffer[] = []
        let size = 0
        for await (const chunk of request) {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          size += bytes.length
          if (size > 2 << 20) throw new Error('large body')
          chunks.push(bytes)
        }
        body = Buffer.concat(chunks).toString('utf8')
      }
      if (Buffer.byteLength(body) > 2 << 20) throw new Error('large body')
    }
    const result = await proxyCloudSnapshot(config, request.method, body)
    response.statusCode = result.status
    response.end(result.body)
  } catch {
    response.statusCode = 502
    response.end(JSON.stringify({ error: 'ارتباط با بک‌اند برقرار نشد' }))
  }
}
