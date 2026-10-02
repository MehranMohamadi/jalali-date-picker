import { describe, expect, it } from 'vitest'
import { getBankSuggestionAmount, parseBankExpenseNotification } from '../src/utils/bankNotification'

describe('parseBankExpenseNotification', () => {
  it('parses Persian toman purchase notifications', () => {
    const result = parseBankExpenseNotification({
      packageName: 'ir.bluebank.mobile',
      appName: 'بلو بانک',
      title: 'خرید موفق',
      text: 'مبلغ ۲۵۰٬۰۰۰ تومان از کارت شما برای خرید کسر شد.',
      postTime: 1783000000000,
    })

    expect(result).toMatchObject({
      amount: 250000,
      category: 'shopping',
      sourceApp: 'بلو بانک',
    })
  })

  it('converts rial amounts to toman', () => {
    const result = parseBankExpenseNotification({
      packageName: 'ir.bluebank.mobile',
      title: 'برداشت از حساب',
      text: 'برداشت ۱٬۲۰۰٬۰۰۰ ریال بابت پرداخت اینترنت انجام شد.',
      postTime: 1783000000001,
    })

    expect(result?.amount).toBe(120000)
  })

  it('uses rial for blu amounts without a currency label', () => {
    const result = parseBankExpenseNotification({
      packageName: 'ir.bluebank.mobile',
      appName: 'بلو بانک',
      title: 'برداشت از حساب',
      text: 'مبلغ ۱٬۲۰۰٬۰۰۰ از حسابت پرید.',
      postTime: 1783000000008,
    })

    expect(result?.amount).toBe(120000)
  })

  it('corrects existing blu suggestions using their original message', () => {
    const suggestion = {
      sourcePackage: 'ir.bluebank.mobile',
      sourceApp: 'بلو بانک',
      rawText: 'برداشت ۱٬۲۰۰٬۰۰۰ ريال از حساب',
      postTime: 1783000000009,
      amount: 1200000,
    }

    expect(getBankSuggestionAmount(suggestion)).toBe(120000)
    expect(getBankSuggestionAmount({ ...suggestion, rawText: 'برداشت ۱۲۰٬۰۰۰ تومان از حساب' })).toBe(120000)
    expect(getBankSuggestionAmount({ ...suggestion, sourcePackage: 'com.example.bank', sourceApp: 'Example Bank' })).toBe(1200000)
  })

  it('uses the withdrawal amount rather than the larger balance in a blu message', () => {
    const result = parseBankExpenseNotification({
      packageName: 'ir.bluebank.mobile',
      title: 'بلو برداشت پول',
      text: 'مهران عزیز 1,599,599 ریال از حسابت پرید. مانده 50,000,000 ریال',
      postTime: 1783000000010,
    })

    expect(result?.amount).toBe(159960)
  })

  it('suggests categories from merchant words', () => {
    const result = parseBankExpenseNotification({
      packageName: 'ir.bluebank.mobile',
      title: 'پرداخت',
      text: 'خرید از رستوران به مبلغ ۳۵۰,۰۰۰ تومان',
      postTime: 1783000000002,
    })

    expect(result?.category).toBe('food')
  })

  it('ignores incoming transfers and OTP messages', () => {
    expect(parseBankExpenseNotification({
      packageName: 'ir.bluebank.mobile',
      title: 'واریز',
      text: 'مبلغ ۹۰۰٬۰۰۰ تومان به حساب شما واریز شد.',
      postTime: 1783000000003,
    })).toBeNull()

    expect(parseBankExpenseNotification({
      packageName: 'ir.bluebank.mobile',
      title: 'رمز پویا',
      text: 'کد تایید شما ۱۲۳۴۵۶ است.',
      postTime: 1783000000004,
    })).toBeNull()
  })

  it('recognizes blu colloquial outgoing and incoming notifications', () => {
    const outgoing = parseBankExpenseNotification({
      packageName: 'ir.bluebank.mobile',
      title: 'پول از حسابت پرید',
      text: '۲۵۰٬۰۰۰ تومان از حسابت پرید.',
      postTime: 1783000000005,
    })
    expect(outgoing?.amount).toBe(250000)

    const incoming = parseBankExpenseNotification({
      packageName: 'ir.bluebank.mobile',
      title: 'پول به حسابت نشست',
      text: '۲۵۰٬۰۰۰ تومان به حسابت نشست.',
      postTime: 1783000000006,
    })
    expect(incoming).toBeNull()
  })

  it('accepts a purchase notification with a merchant code from another app', () => {
    const result = parseBankExpenseNotification({
      packageName: 'com.example.bank',
      title: 'خرید موفق',
      text: 'مبلغ ۱۲۰٬۰۰۰ تومان، کد پذیرنده ۱۲۳۴',
      postTime: 1783000000007,
    })

    expect(result).toMatchObject({ amount: 120000, sourceApp: 'com.example.bank' })
  })
})
