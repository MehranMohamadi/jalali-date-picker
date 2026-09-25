import { handleAccountRequest } from '../../../src/server/accountApi'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const host = getHeader(event, 'host') ?? ''
  const secure = getHeader(event, 'x-forwarded-proto') === 'https' || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
  const result = await handleAccountRequest({
    method: event.method,
    origin: getHeader(event, 'origin'),
    host,
    cookie: getHeader(event, 'cookie'),
    secure,
    body: event.method === 'POST' ? await readRawBody(event) : undefined,
  })
  if (result.setCookie) appendHeader(event, 'Set-Cookie', result.setCookie)
  setResponseStatus(event, result.status)
  return JSON.parse(result.body)
})
