export interface AdviceHistoryTransaction {
  date: string
  type: 'income' | 'expense'
  amount: number
  sourceType?: string
  category?: string
}

export function summarizeFinancialHistory(
  transactions: AdviceHistoryTransaction[],
  today: string,
  normalizeDate: (date: string) => string,
) {
  const months = new Map<string, { month: string; income: number; expense: number }>()
  const categories = new Map<string, number>()
  let allTimeIncome = 0
  let allTimeExpense = 0

  for (const item of transactions) {
    const date = normalizeDate(item.date)
    if (date > today) continue
    const month = date.slice(0, 7)
    const summary = months.get(month) ?? { month, income: 0, expense: 0 }
    if (item.type === 'income') {
      summary.income += item.amount
      allTimeIncome += item.amount
    } else if (item.sourceType !== 'credit-payment') {
      summary.expense += item.amount
      allTimeExpense += item.amount
      const category = item.category ?? 'other'
      categories.set(category, (categories.get(category) ?? 0) + item.amount)
    }
    months.set(month, summary)
  }

  return {
    allTimeIncome,
    allTimeExpense,
    monthlyHistory: [...months.values()].sort((first, second) => first.month.localeCompare(second.month)),
    categorySpending: [...categories.entries()].map(([key, spent]) => ({ key, spent }))
      .sort((first, second) => second.spent - first.spent),
  }
}
