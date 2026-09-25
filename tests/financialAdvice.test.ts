import { describe, expect, it, vi } from 'vitest'
import { FinancialAdviceError, generateFinancialAdvice, parseFinancialAdviceBody, validateFinancialAdviceSnapshot, verifyFinancialAdviceAccess } from '../src/utils/financialAdvice'
import { POST } from '../api/financial-advice'

const snapshot = {
  date: '1405/07/03',
  monthlyIncome: 10000000,
  monthlyExpense: 6000000,
  availableBalance: 2000000,
  monthlyBudget: 8000000,
  unpaidCredit: 500000,
  dueInstallments: 1000000,
  totalDebt: 3000000,
  safeDailySpend: 100000,
  healthScore: 65,
  categories: [{ name: 'خوراک', budget: 3000000, spent: 2500000 }],
}

describe('GapGPT financial advice', () => {
  it('rejects malformed or oversized client summaries', () => {
    expect(() => parseFinancialAdviceBody('x')).toThrow(FinancialAdviceError)
    expect(() => parseFinancialAdviceBody(' '.repeat(12001))).toThrow(FinancialAdviceError)
    expect(() => validateFinancialAdviceSnapshot({ ...snapshot, monthlyExpense: -1 })).toThrow(FinancialAdviceError)
    expect(() => validateFinancialAdviceSnapshot({ ...snapshot, categories: [{ name: 'x'.repeat(61), spent: 0, budget: 0 }] })).toThrow(FinancialAdviceError)
  })

  it('checks the separate access token', () => {
    expect(verifyFinancialAdviceAccess('owner-token', 'owner-token')).toBe(true)
    expect(verifyFinancialAdviceAccess('wrong-token', 'owner-token')).toBe(false)
    expect(verifyFinancialAdviceAccess('owner-token', undefined)).toBe(false)
  })

  it('sends only the validated summary to GapGPT when requested', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '  هزینه خوراک را کنترل کن.  ' } }] }), { status: 200 }))
    const advice = await generateFinancialAdvice({ ...snapshot, transactionDetails: 'private' }, 'provider-secret', 'gpt-4o', fetcher as typeof fetch)
    expect(advice).toBe('هزینه خوراک را کنترل کن.')
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.gapgpt.app/v1/chat/completions')
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer provider-secret')
    expect(options.body).not.toContain('private')
  })

  it('does not call the provider without a configured key', async () => {
    const fetcher = vi.fn()
    await expect(generateFinancialAdvice(snapshot, undefined, 'gpt-4o', fetcher)).rejects.toMatchObject({ status: 503 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects requests without the server access token', async () => {
    const previous = process.env.BUDGETYAR_ANALYSIS_TOKEN
    process.env.BUDGETYAR_ANALYSIS_TOKEN = 'owner-token'
    try {
      const response = await POST(new Request('https://example.test/api/financial-advice', { method: 'POST', body: JSON.stringify(snapshot) }))
      expect(response.status).toBe(401)
    } finally {
      if (previous === undefined) delete process.env.BUDGETYAR_ANALYSIS_TOKEN
      else process.env.BUDGETYAR_ANALYSIS_TOKEN = previous
    }
  })
})
