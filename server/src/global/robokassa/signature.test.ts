import { describe, it, expect } from 'bun:test'
import { createHash } from 'node:crypto'
import type { RobokassaConfig } from './config'
import {
  PAYMENT_PAGE_URL,
  buildPaymentUrl,
  buildReceipt,
  formatExpirationDate,
  formatOutSum,
  verifyResultSignature,
} from './signature'

const config: RobokassaConfig = {
  merchantLogin: 'shop',
  password1: 'pass1',
  password2: 'pass2',
  isTest: true,
  hash: 'md5',
  receipt: false,
  tax: 'none',
}

const md5 = (value: string) => createHash('md5').update(value).digest('hex')

// 12:30 UTC = 15:30 по Москве
const expiresAt = new Date(Date.UTC(2026, 8, 28, 12, 30))

describe('robokassa signature', () => {
  it('formatOutSum — рубли с копейками через точку', () => {
    expect(formatOutSum(1500)).toBe('1500.00')
    expect(formatOutSum(0)).toBe('0.00')
  })

  it('formatExpirationDate — московское время без зоны', () => {
    expect(formatExpirationDate(expiresAt)).toBe('2026-09-28T15:30')
  })

  it('buildPaymentUrl без чека — подпись Login:OutSum:InvId:Pass1', () => {
    const url = new URL(
      buildPaymentUrl(config, { invId: 42, outSum: 1500, description: 'Заказ 42', expiresAt }),
    )

    expect(`${url.origin}${url.pathname}`).toBe(PAYMENT_PAGE_URL)
    expect(url.searchParams.get('MerchantLogin')).toBe('shop')
    expect(url.searchParams.get('OutSum')).toBe('1500.00')
    expect(url.searchParams.get('InvId')).toBe('42')
    expect(url.searchParams.get('Description')).toBe('Заказ 42')
    expect(url.searchParams.get('Culture')).toBe('ru')
    expect(url.searchParams.get('ExpirationDate')).toBe('2026-09-28T15:30')
    expect(url.searchParams.get('IsTest')).toBe('1')
    expect(url.searchParams.get('Receipt')).toBeNull()
    expect(url.searchParams.get('SignatureValue')).toBe(md5('shop:1500.00:42:pass1'))
  })

  it('buildPaymentUrl — без IsTest в боевом режиме, с Email, Description режется до 100', () => {
    const url = new URL(
      buildPaymentUrl(
        { ...config, isTest: false },
        { invId: 1, outSum: 10, description: 'x'.repeat(150), email: 'a@b.ru', expiresAt },
      ),
    )

    expect(url.searchParams.get('IsTest')).toBeNull()
    expect(url.searchParams.get('Email')).toBe('a@b.ru')
    expect(url.searchParams.get('Description')).toHaveLength(100)
  })

  it('buildPaymentUrl с чеком — Receipt закодирован один раз в подписи и дважды в ссылке', () => {
    const receipt = buildReceipt([{ name: 'Мишка', quantity: 2, price: 750 }], 390, 'none')
    const raw = buildPaymentUrl(config, {
      invId: 42,
      outSum: 1890,
      description: 'Заказ 42',
      receipt,
      expiresAt,
    })
    const url = new URL(raw)
    const encoded = encodeURIComponent(JSON.stringify(receipt))

    // searchParams.get снимает один слой кодирования — остаётся значение из подписи.
    expect(url.searchParams.get('Receipt')).toBe(encoded)
    expect(raw).toContain('Receipt=%257B') // '{' → %7B → %257B
    expect(url.searchParams.get('SignatureValue')).toBe(md5(`shop:1890.00:42:${encoded}:pass1`))
  })

  it('buildPaymentUrl — сумма чека не равна OutSum → ошибка', () => {
    const receipt = buildReceipt([{ name: 'Мишка', quantity: 1, price: 750 }], null, 'none')

    expect(() =>
      buildPaymentUrl(config, { invId: 1, outSum: 1000, description: 'x', receipt, expiresAt }),
    ).toThrow()
  })

  it('buildPaymentUrl — алгоритм из конфига (sha256)', () => {
    const url = new URL(
      buildPaymentUrl({ ...config, hash: 'sha256' }, { invId: 1, outSum: 10, description: 'x', expiresAt }),
    )
    const expected = createHash('sha256').update('shop:10.00:1:pass1').digest('hex')

    expect(url.searchParams.get('SignatureValue')).toBe(expected)
  })

  it('buildReceipt — позиции, доставка отдельной строкой, длинное имя режется', () => {
    const receipt = buildReceipt(
      [
        { name: 'М'.repeat(200), quantity: 2, price: 750 },
        { name: 'Шарф', quantity: 1, price: 900 },
      ],
      390,
      'none',
    )

    expect(receipt.items).toHaveLength(3)
    expect(receipt.items[0]).toEqual({
      name: 'М'.repeat(128),
      quantity: 2,
      sum: 1500,
      tax: 'none',
      payment_method: 'full_payment',
      payment_object: 'commodity',
    })
    expect(receipt.items[2]).toEqual({
      name: 'Доставка СДЭК',
      quantity: 1,
      sum: 390,
      tax: 'none',
      payment_method: 'full_payment',
      payment_object: 'service',
    })
    expect(buildReceipt([{ name: 'Шарф', quantity: 1, price: 900 }], null, 'none').items).toHaveLength(1)
    expect(buildReceipt([{ name: 'Шарф', quantity: 1, price: 900 }], 0, 'none').items).toHaveLength(1)
  })

  it('verifyResultSignature — OutSum:InvId:Pass2 по сырым строкам, регистр не важен', () => {
    const signature = md5('1500.000000:42:pass2').toUpperCase()

    expect(verifyResultSignature(config, { outSum: '1500.000000', invId: '42', signature })).toBe(true)
    // Та же сумма в другом написании — другая подпись: пересобирать строку нельзя.
    expect(verifyResultSignature(config, { outSum: '1500.00', invId: '42', signature })).toBe(false)
    expect(verifyResultSignature(config, { outSum: '1500.000000', invId: '43', signature })).toBe(false)
    expect(verifyResultSignature(config, { outSum: '1500.000000', invId: '42', signature: '' })).toBe(false)
  })
})
