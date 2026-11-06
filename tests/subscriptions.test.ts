import { describe, expect, it } from 'vitest'
import { restoreSubscriptions, subscriptionDaysRemaining } from '../src/utils/subscriptions'

describe('subscription expiry tracking', () => {
  it('counts calendar days across months and leap year boundaries', () => {
    expect(subscriptionDaysRemaining('1403/02/01', '1403/01/22')).toBe(10)
    expect(subscriptionDaysRemaining('1403/02/01', '1403/01/01')).toBe(31)
    expect(subscriptionDaysRemaining('1404/01/01', '1403/12/30')).toBe(1)
    expect(subscriptionDaysRemaining('1405/01/01', '1404/12/29')).toBe(1)
  })

  it('distinguishes today and expired dates without rolling them forward', () => {
    expect(subscriptionDaysRemaining('1403/01/01', '1403/01/01')).toBe(0)
    expect(subscriptionDaysRemaining('1403/01/01', '1403/01/11')).toBe(-10)
  })

  it('restores old backups and rejects malformed or duplicate entries', () => {
    expect(restoreSubscriptions(undefined)).toEqual([])
    expect(restoreSubscriptions([
      null, { id: 'bad', title: 'Test', endDate: '1404/12/30' },
      { id: 'a', title: ' VPN ', endDate: '۱۴۰۳/۱/۲' },
      { id: 'a', title: 'Duplicate', endDate: '1403/02/01' },
      { id: 'b', title: ' ', endDate: '1403/01/01' },
    ])).toEqual([{ id: 'a', title: 'VPN', endDate: '1403/01/02' }])
  })
})
