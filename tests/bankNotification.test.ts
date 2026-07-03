import { describe, expect, it } from 'vitest'
import { parseBankExpenseNotification } from '../src/utils/bankNotification'

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
})
