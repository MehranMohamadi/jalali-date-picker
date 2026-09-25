export interface InstallmentPaymentState {
  totalCount: number
  paidCount: number
  paidIndexes?: number[]
}

export function getPaidInstallmentIndexes(plan: InstallmentPaymentState): number[] {
  const count = Math.max(0, Math.trunc(plan.totalCount))
  const indexes = Array.isArray(plan.paidIndexes)
    ? plan.paidIndexes
    : Array.from({ length: Math.min(count, Math.max(0, Math.trunc(plan.paidCount))) }, (_, index) => index)

  return [...new Set(indexes.filter((index) => Number.isInteger(index) && index >= 0 && index < count))].sort((a, b) => a - b)
}

export function getNextUnpaidInstallmentIndex(plan: InstallmentPaymentState): number {
  const paid = new Set(getPaidInstallmentIndexes(plan))
  for (let index = 0; index < plan.totalCount; index += 1) {
    if (!paid.has(index)) return index
  }
  return -1
}

export function setInstallmentPaid(plan: InstallmentPaymentState, index: number, isPaid: boolean) {
  const paid = new Set(getPaidInstallmentIndexes(plan))
  if (isPaid) paid.add(index)
  else paid.delete(index)
  const paidIndexes = [...paid].sort((a, b) => a - b)
  return { paidIndexes, paidCount: paidIndexes.length }
}

export function getForecastInstallmentEvents(
  installments: Array<{ dueDate: string; amount: number }>,
  today: string,
  endDate: string,
) {
  return installments
    .filter((item) => item.dueDate <= endDate)
    .map((item) => ({ date: item.dueDate < today ? today : item.dueDate, amount: item.amount, kind: 'expense' as const, source: 'installment' as const }))
}
