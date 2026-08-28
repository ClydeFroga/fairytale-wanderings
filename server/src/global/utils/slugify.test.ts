import { describe, expect, it } from 'bun:test'
import { slugify, uniqueSlug } from './slugify'

describe('slugify', () => {
  it('транслитерирует кириллицу', () => {
    expect(slugify('Вязаный мишка Тедди')).toBe('vyazanyi-mishka-teddi')
  })
})

describe('uniqueSlug', () => {
  it('возвращает base, если он свободен', () => {
    expect(uniqueSlug('Посуда', [], 'product')).toBe('posuda')
  })

  it('при коллизии добавляет -2, потом -3', () => {
    expect(uniqueSlug('Посуда', ['posuda'], 'product')).toBe('posuda-2')
    expect(uniqueSlug('Посуда', ['posuda', 'posuda-2'], 'product')).toBe('posuda-3')
  })

  it('если из названия ничего не вышло — fallback', () => {
    expect(uniqueSlug('🙂', [], 'product')).toBe('product')
    expect(uniqueSlug('🙂', ['product'], 'product')).toBe('product-2')
  })
})
