import { FinancialAdviceError, generateFinancialAdvice, parseFinancialAdviceBody, verifyFinancialAdviceAccess } from '../../../src/utils/financialAdvice'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  if (!process.env.BUDGETYAR_ANALYSIS_TOKEN) {
    throw createError({ statusCode: 503, statusMessage: 'رمز دسترسی تحلیل روی سرور تنظیم نشده است' })
  }
  if (!verifyFinancialAdviceAccess(getHeader(event, 'x-budgetyar-analysis-token'), process.env.BUDGETYAR_ANALYSIS_TOKEN)) {
    throw createError({ statusCode: 401, statusMessage: 'رمز دسترسی تحلیل نادرست است' })
  }
  try {
    const snapshot = parseFinancialAdviceBody(await readRawBody(event) ?? '')
    const analysis = await generateFinancialAdvice(snapshot, process.env.GAPGPT_API_KEY, process.env.GAPGPT_MODEL)
    return { analysis }
  } catch (error) {
    const known = error instanceof FinancialAdviceError ? error : new FinancialAdviceError(500, 'تحلیل انجام نشد؛ دوباره تلاش کنید')
    throw createError({ statusCode: known.status, statusMessage: known.message })
  }
})
