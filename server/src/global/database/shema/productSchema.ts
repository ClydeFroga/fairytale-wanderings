import { pgTable, uuid, text, integer, boolean, jsonb } from 'drizzle-orm/pg-core'

// Ключи JS оставлены в форме, которую ожидает клиент (_id, image, isActive, details),
// чтобы витрина продолжала работать без изменений. Имена колонок в БД — snake_case.
export const products = pgTable('products', {
  _id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull(),
  image: jsonb('image').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  details: jsonb('details').$type<Record<string, string>>().notNull().default({}),
  stock: integer('stock').notNull().default(0), // остаток на складе
})

export type IProduct = typeof products.$inferSelect
export type INewProduct = typeof products.$inferInsert
