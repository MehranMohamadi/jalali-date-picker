import type { IncomingMessage, ServerResponse } from 'node:http'
import { FinancialAdviceError, generateFinancialAdvice, parseFinancialAdviceBody } from '../src/utils/financialAdvice'

export async function analyzeFinancialAdviceBody(raw: string, apiKey = process.env.GAPGPT_API_KEY, model = process.env.GAPGPT_MODEL) {
  try {
    const snapshot = parseFinancialAdviceBody(raw)
    const analysis = await generateFinancialAdvice(snapshot, apiKey, model)
    return { status: 200, body: { analysis } }
  } catch (error) {
    const known = error instanceof FinancialAdviceError ? error : new FinancialAdviceError(500, 'تحلیل انجام نشد؛ دوباره تلاش کنید')
    return { status: known.status, body: { error: known.message } }
  }
}

// The deployed frontend is static; Vercel serves this file as a separate Node function.
export default async function handler(request: IncomingMessage & { body?: unknown }, response: ServerResponse) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (request.method !== 'POST') {
    response.statusCode = 405
    response.setHeader('Allow', 'POST')
    response.end(JSON.stringify({ error: 'این مسیر فقط درخواست POST را می‌پذیرد' }))
    return
  }

  try {
    let raw: string
    if (request.body !== undefined && request.body !== null) {
      raw = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
    } else {
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of request) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        size += bytes.length
        if (size > 12000) throw new FinancialAdviceError(413, 'حجم داده‌های تحلیل بیش از حد مجاز است')
        chunks.push(bytes)
      }
      raw = Buffer.concat(chunks).toString('utf8')
    }
    const result = await analyzeFinancialAdviceBody(raw)
    response.statusCode = result.status
    response.end(JSON.stringify(result.body))
  } catch (error) {
    response.statusCode = error instanceof FinancialAdviceError ? error.status : error instanceof SyntaxError ? 400 : 500
    response.end(JSON.stringify({ error: error instanceof FinancialAdviceError ? error.message : 'تحلیل انجام نشد؛ دوباره تلاش کنید' }))
  }
}
