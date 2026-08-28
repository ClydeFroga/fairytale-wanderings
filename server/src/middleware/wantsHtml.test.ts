import { describe, expect, it } from 'bun:test'
import { wantsHtml } from './wantsHtml'

describe('wantsHtml', () => {
  it('пустой и отсутствующий Accept считает HTML-навигацией', () => {
    expect(wantsHtml(undefined)).toBe(true)
    expect(wantsHtml('')).toBe(true)
    expect(wantsHtml('   ')).toBe(true)
  })

  it('text/html и */* — true, application/json — false', () => {
    expect(wantsHtml('text/html')).toBe(true)
    expect(wantsHtml('text/html,application/xhtml+xml')).toBe(true)
    expect(wantsHtml('*/*')).toBe(true)
    expect(wantsHtml('application/json')).toBe(false)
  })
})
