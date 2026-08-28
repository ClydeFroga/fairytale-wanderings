import { describe, expect, it } from 'bun:test'
import { matchSeoPath } from './page'

describe('matchSeoPath', () => {
  it('главная без query — индекс', () => {
    expect(matchSeoPath('/', '')).toEqual({ type: 'home', noindex: false })
  })

  it('главная с category — noindex', () => {
    expect(matchSeoPath('/', '?category=toys')).toEqual({ type: 'home', noindex: true })
  })

  it('карточка', () => {
    expect(matchSeoPath('/product/lisa', '')).toEqual({ type: 'product', param: 'lisa' })
  })

  it('карточка с utm всё равно product', () => {
    expect(matchSeoPath('/product/lisa', '?utm=tg')).toEqual({ type: 'product', param: 'lisa' })
  })

  it('служебные — utility', () => {
    expect(matchSeoPath('/cart', '').type).toBe('utility')
    expect(matchSeoPath('/admin', '').type).toBe('utility')
    expect(matchSeoPath('/order/success', '').type).toBe('utility')
  })

  it('неизвестный путь — missing', () => {
    expect(matchSeoPath('/nope', '').type).toBe('missing')
  })

  it('сломанный percent-encoding в slug — missing, не throw', () => {
    expect(matchSeoPath('/product/%E0%A4%A', '')).toEqual({ type: 'missing' })
    expect(matchSeoPath('/product/%', '')).toEqual({ type: 'missing' })
  })
})
