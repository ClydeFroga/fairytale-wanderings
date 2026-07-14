import { pgTable, uuid, text, integer } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // отображаемое имя, напр. «Игрушки»
  slug: text("slug").notNull().unique(), // стабильный ключ для фильтра в URL
  sortOrder: integer("sort_order").notNull().default(0),
});

export type ICategory = typeof categories.$inferSelect;
export type INewCategory = typeof categories.$inferInsert;
