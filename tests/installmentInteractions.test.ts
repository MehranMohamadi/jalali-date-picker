import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBudgetyar, type InstallmentPlan } from '../playground/composables/useBudgetyar'

const app = useBudgetyar()

function makePlan(): InstallmentPlan {
  return {
    id: 123,
    title: 'وام آزمایشی',
    amount: 100000,
    category: 'other',
    startDate: app.todayKey.value,
    dueDay: app.currentJalaliDate.day,
    totalCount: 3,
    paidCount: 0,
    paidIndexes: [],
    paymentMethod: 'cash',
  }
}

describe('installment payment interactions', () => {
  beforeEach(() => {
    app.transactions.value = []
    app.installments.value = [makePlan()]
    app.toasts.value = []
    vi.stubGlobal('window', { confirm: vi.fn(() => true), setTimeout: vi.fn() })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('reopens a paid installment when its payment transaction is deleted', () => {
    app.payInstallment(app.installments.value[0]!)
    expect(app.installmentSummaries.value[0]?.paidCount).toBe(1)
    expect(app.installmentSummaries.value[0]?.lastPaidIndex).toBe(0)

    app.removeTransaction(app.transactions.value[0]!.id)
    expect(app.transactions.value).toHaveLength(0)
    expect(app.installmentSummaries.value[0]?.paidCount).toBe(0)
    expect(app.installmentMonthlySchedule.value.flatMap((month) => month.items)[0]?.isPaid).toBe(false)
  })

  it('keeps the installment paid while another linked payment remains', () => {
    app.payInstallment(app.installments.value[0]!)
    const payment = app.transactions.value[0]!
    app.transactions.value.push({ ...payment, id: payment.id + 1 })

    app.removeTransaction(payment.id)
    expect(app.installmentSummaries.value[0]?.paidCount).toBe(1)
    expect(app.transactions.value).toHaveLength(1)

    app.undoInstallmentPayment(123, 0)
    expect(app.installmentSummaries.value[0]?.paidCount).toBe(0)
    expect(app.transactions.value).toHaveLength(0)
  })

  it('can undo the most recent payment on an active installment', () => {
    app.payInstallment(app.installments.value[0]!)
    const summary = app.installmentSummaries.value[0]!
    expect(summary.status).not.toBe('completed')

    app.undoInstallmentPayment(summary.id, summary.lastPaidIndex)
    expect(app.installmentSummaries.value[0]?.paidCount).toBe(0)
    expect(app.transactions.value).toHaveLength(0)
  })
})
