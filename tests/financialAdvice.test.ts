import { describe, expect, it, vi } from 'vitest'
import { FinancialAdviceError, generateFinancialAdvice, parseFinancialAdviceBody, validateFinancialAdviceSnapshot } from '../src/utils/financialAdvice'
import handler, { analyzeFinancialAdviceBody } from '../api/financial-advice'

const snapshot = {
  date: '1405/07/03',
  monthlyIncome: 10000000,
  monthlyExpense: 6000000,
  allTimeIncome: 30000000,
  allTimeExpense: 21000000,
  monthlyHistory: [
    { month: '1405/05', income: 10000000, expense: 7000000 },
    { month: '1405/06', income: 10000000, expense: 8000000 },
    { month: '1405/07', income: 10000000, expense: 6000000 },
  ],
  allTimeCategories: [{ name: 'خوراک', spent: 9000000 }],
  availableBalance: 2000000,
  monthlyBudget: 8000000,
  unpaidCredit: 500000,
  dueInstallments: 1000000,
  remainingInstallments: 5000000,
  monthlyRecurringExpense: 750000,
  remainingGoals: 2000000,
  totalDebt: 3000000,
  safeDailySpend: 100000,
  healthScore: 65,
  categories: [{ name: 'خوراک', budget: 3000000, spent: 2500000 }],
}

describe('GapGPT financial advice', () => {
  it('rejects malformed or oversized client summaries', () => {
    expect(() => parseFinancialAdviceBody('x')).toThrow(FinancialAdviceError)
    expect(() => parseFinancialAdviceBody(' '.repeat(100001))).toThrow(FinancialAdviceError)
    expect(() => validateFinancialAdviceSnapshot({ ...snapshot, monthlyExpense: -1 })).toThrow(FinancialAdviceError)
    expect(() => validateFinancialAdviceSnapshot({ ...snapshot, categories: [{ name: 'x'.repeat(61), spent: 0, budget: 0 }] })).toThrow(FinancialAdviceError)
    expect(() => validateFinancialAdviceSnapshot({ ...snapshot, monthlyHistory: [{ month: '1405/06', income: -1, expense: 0 }] })).toThrow(FinancialAdviceError)
  })

  it('sends only the validated summary to GapGPT when requested', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '  هزینه خوراک را کنترل کن.  ' } }] }), { status: 200 }))
    const advice = await generateFinancialAdvice({ ...snapshot, transactionDetails: 'private' }, 'provider-secret', 'gpt-4o', fetcher as typeof fetch)
    expect(advice).toBe('هزینه خوراک را کنترل کن.')
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.gapgpt.app/v1/chat/completions')
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer provider-secret')
    expect(options.body).not.toContain('private')
    expect(options.body).toContain('1405/05')
    expect(options.body).toContain('allTimeExpense')
  })

  it('does not call the provider without a configured key', async () => {
    const fetcher = vi.fn()
    await expect(generateFinancialAdvice(snapshot, undefined, 'gpt-4o', fetcher)).rejects.toMatchObject({ status: 503 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('accepts requests without an access token and validates their body', async () => {
    expect((await analyzeFinancialAdviceBody('x', '')).status).toBe(400)
    expect((await analyzeFinancialAdviceBody(JSON.stringify(snapshot), '')).status).toBe(503)
    expect((await analyzeFinancialAdviceBody(JSON.stringify({ ...snapshot, monthlyExpense: -1 }), 'provider-test')).status).toBe(400)
  })

  it('serves a Vercel-style POST without an access header', async () => {
    const originalKey = process.env.GAPGPT_API_KEY
    const originalFetch = globalThis.fetch
    process.env.GAPGPT_API_KEY = 'provider-test'
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'تحلیل آزمایشی' } }] }), { status: 200 })) as typeof fetch
    const response = {
      statusCode: 0,
      setHeader: vi.fn(),
      end: vi.fn(),
    }
    try {
      await handler({ method: 'POST', body: { ...snapshot, transactionDetails: 'private' } } as Parameters<typeof handler>[0], response as unknown as Parameters<typeof handler>[1])
      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.end.mock.calls[0]![0] as string)).toEqual({ analysis: 'تحلیل آزمایشی' })
      const requestBody = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body as string
      expect(requestBody).not.toContain('private')
      expect(requestBody).toContain('1405/05')
      expect(requestBody).toContain('remainingGoals')
    } finally {
      globalThis.fetch = originalFetch
      if (originalKey === undefined) delete process.env.GAPGPT_API_KEY
      else process.env.GAPGPT_API_KEY = originalKey
    }
  })
})
