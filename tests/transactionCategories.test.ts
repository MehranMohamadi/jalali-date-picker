import { describe, expect, it } from 'vitest'
import {
  getTransactionCategories,
  getTransactionSubCategories,
  matchesTransactionCategory,
  resolveTransactionCategories,
} from '../src/utils/transactionCategories'

describe('transactionCategories utility', () => {
  it('returns category as array for legacy single-category transactions', () => {
    expect(getTransactionCategories({ category: 'food' })).toEqual(['food'])
    expect(getTransactionCategories({})).toEqual([])
  })

  it('returns full categories array when present on transaction', () => {
    expect(getTransactionCategories({ category: 'food', categories: ['food', 'fun', 'transport'] })).toEqual([
      'food',
      'fun',
      'transport',
    ])
  })

  it('extracts secondary categories excluding primary category', () => {
    expect(
      getTransactionSubCategories({
        category: 'food',
        categories: ['food', 'fun', 'shopping'],
      }),
    ).toEqual(['fun', 'shopping'])

    expect(
      getTransactionSubCategories({
        category: 'food',
      }),
    ).toEqual([])
  })

  it('resolves combined categories preserving primary without duplicates', () => {
    const resolved = resolveTransactionCategories('food', ['fun', 'food', 'bills'])
    expect(resolved.category).toBe('food')
    expect(resolved.categories).toEqual(['food', 'fun', 'bills'])

    const empty = resolveTransactionCategories(undefined, ['fun'])
    expect(empty.category).toBeUndefined()
    expect(empty.categories).toBeUndefined()
  })

  it('matches transaction when selected category matches primary or secondary', () => {
    const labelMap: Record<string, string> = {
      food: 'خوراکی',
      fun: 'تفریح',
      bills: 'قبوض',
    }
    const getLabel = (k: string) => labelMap[k] ?? k

    const tx = {
      category: 'food',
      categories: ['food', 'fun'],
    }

    expect(matchesTransactionCategory(tx, 'همه', getLabel)).toBe(true)
    expect(matchesTransactionCategory(tx, 'خوراکی', getLabel)).toBe(true)
    expect(matchesTransactionCategory(tx, 'تفریح', getLabel)).toBe(true)
    expect(matchesTransactionCategory(tx, 'قبوض', getLabel)).toBe(false)
  })
})
