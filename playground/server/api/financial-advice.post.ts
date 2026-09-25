import { FinancialAdviceError, generateFinancialAdvice, parseFinancialAdviceBody } from '../../../src/utils/financialAdvice'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const snapshot = parseFinancialAdviceBody(await readRawBody(event) ?? '')
    const analysis = await generateFinancialAdvice(snapshot, process.env.GAPGPT_API_KEY, process.env.GAPGPT_MODEL)
    return { analysis }
  } catch (error) {
    const known = error instanceof FinancialAdviceError ? error : new FinancialAdviceError(500, 'تحلیل انجام نشد؛ دوباره تلاش کنید')
    throw createError({ statusCode: known.status, statusMessage: known.message })
  }
})
