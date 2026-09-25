export interface CreditLedgerTransaction {
  type: 'income' | 'expense'
  amount: number
  date: string
  paymentMethod?: string
  sourceType?: string
  sourceId?: string
}

export interface CreditMonth {
  month: string
  purchases: number
  paid: number
  remaining: number
}

export function getCreditMonths(transactions: CreditLedgerTransaction[]): CreditMonth[] {
  const months = new Map<string, CreditMonth>()
  const payments: CreditLedgerTransaction[] = []

  for (const item of transactions) {
    if (item.type !== 'expense' || !Number.isFinite(item.amount) || item.amount <= 0) continue
    if (item.sourceType === 'credit-payment') {
      payments.push(item)
      continue
    }
    if (item.paymentMethod !== 'credit') continue

    const month = item.date.slice(0, 7)
    const row = months.get(month) ?? { month, purchases: 0, paid: 0, remaining: 0 }
    row.purchases += item.amount
    months.set(month, row)
  }

  const rows = [...months.values()].sort((a, b) => a.month.localeCompare(b.month))
  for (const payment of payments.filter((item) => item.sourceId && months.has(item.sourceId))) {
    const row = months.get(payment.sourceId!)!
    row.paid = Math.min(row.purchases, row.paid + payment.amount)
  }

  // Older settlements had no linked month and originally reduced their payment month's bill.
  for (const payment of payments.filter((item) => !item.sourceId || !months.has(item.sourceId)).sort((a, b) => a.date.localeCompare(b.date))) {
    let amount = payment.amount
    const sameMonth = months.get(payment.date.slice(0, 7))
    if (sameMonth) {
      const applied = Math.min(amount, sameMonth.purchases - sameMonth.paid)
      sameMonth.paid += applied
      amount -= applied
    }
    for (const row of rows) {
      const applied = Math.min(amount, row.purchases - row.paid)
      row.paid += applied
      amount -= applied
      if (amount <= 0) break
    }
  }

  for (const row of rows) row.remaining = row.purchases - row.paid
  return rows
}
