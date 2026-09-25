import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleAccountRequest } from '../src/server/accountApi.js'

export default async function handler(request: IncomingMessage & { body?: unknown }, response: ServerResponse) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  let body: string | undefined
  if (request.method === 'POST') {
    if (request.body !== undefined) body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
    else {
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of request) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        size += bytes.length
        if (size > 8192) break
        chunks.push(bytes)
      }
      body = size > 8192 ? '' : Buffer.concat(chunks).toString('utf8')
    }
  }
  const host = request.headers.host ?? ''
  const secure = request.headers['x-forwarded-proto'] === 'https' || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
  const result = await handleAccountRequest({
    method: request.method,
    origin: request.headers.origin,
    host,
    cookie: request.headers.cookie,
    secure,
    body,
  })
  if (result.setCookie) response.setHeader('Set-Cookie', result.setCookie)
  response.statusCode = result.status
  response.end(result.body)
}
