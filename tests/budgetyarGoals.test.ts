import { describe, expect, it } from 'vitest'
import { calculateGoalScenario, calculateGoalSnapshot } from '../src/utils/budgetyarGoals'

describe('Budgetyar goal calculations', () => {
  it('applies inflation policy to a fixed-money target', () => {
    const snapshot = calculateGoalSnapshot({
      id: 'inflation', title: 'هدف', targetAmount: 1000000, savedAmount: 0,
      targetValuePolicy: 'INFLATION_INDEXED', inflationRate: 20,
      startDate: '1403/01/01', targetDate: '1404/01/01',
    }, [], null, '1404/01/01')

    expect(snapshot.currentRequiredAmount).toBeGreaterThan(1190000)
    expect(snapshot.currentRequiredAmount).toBeLessThan(1210000)
  })

  it('keeps accelerated and paused scenarios distinct with a ledger', () => {
    const goal = { id: 'g1', title: 'طلا', targetAmount: 100, savedAmount: 0, trackingMode: 'ASSET_HOLDING' as const, targetQuantity: 100, assetCode: 'gold18', targetDate: '1404/12/29' }
    const transactions = [{ goalId: 'g1', type: 'ASSET_PURCHASE' as const, baseAmount: 5000000, quantity: 10, unitPrice: 500000, fee: 0, currency: 'irr' as const, occurredAt: '1404/01/01' }]
    const scenario = calculateGoalScenario(goal, transactions, { gold18: 500000 }, '1404/06/01')

    expect(scenario.baseline.currentQuantity).toBe(10)
    expect(scenario.accelerated.currentQuantity).toBeGreaterThan(scenario.paused.currentQuantity)
    expect(scenario.accelerated.progressPercent).toBeGreaterThan(scenario.paused.progressPercent)
  })
})
