import { FinancialAdviceError, generateFinancialAdvice, parseFinancialAdviceBody, verifyFinancialAdviceAccess } from '../src/utils/financialAdvice'

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  if (!process.env.BUDGETYAR_ANALYSIS_TOKEN) {
    return Response.json({ error: 'رمز دسترسی تحلیل روی سرور تنظیم نشده است' }, { status: 503, headers })
  }
  if (!verifyFinancialAdviceAccess(request.headers.get('x-budgetyar-analysis-token'), process.env.BUDGETYAR_ANALYSIS_TOKEN)) {
    return Response.json({ error: 'رمز دسترسی تحلیل نادرست است' }, { status: 401, headers })
  }
  try {
    const snapshot = parseFinancialAdviceBody(await request.text())
    const analysis = await generateFinancialAdvice(snapshot, process.env.GAPGPT_API_KEY, process.env.GAPGPT_MODEL)
    return Response.json({ analysis }, { headers })
  } catch (error) {
    const known = error instanceof FinancialAdviceError ? error : new FinancialAdviceError(500, 'تحلیل انجام نشد؛ دوباره تلاش کنید')
    return Response.json({ error: known.message }, { status: known.status, headers })
  }
}
