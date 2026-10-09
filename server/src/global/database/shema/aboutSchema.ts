import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";

export type SellerLink = { label: string; url: string };

// Страница «Обо мне» и реквизиты продавца — по одной строке на магазин:
// id всегда 1, check не даёт завести вторую. Строки появляются при первом
// сохранении из CRM, до этого чтение отдаёт пустые значения.
export const aboutPage = pgTable(
  "about_page",
  {
    id: smallint("id").primaryKey().default(1),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""), // простой текст, абзацы — через пустую строку
    images: jsonb("images").$type<string[]>().notNull().default([]), // как products.image
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("about_page_single_row", sql`${table.id} = 1`)],
);

// Реквизиты отдельно от страницы: их же потом читают оферта и подвал.
export const sellerInfo = pgTable(
  "seller_info",
  {
    id: smallint("id").primaryKey().default(1),
    fullName: text("full_name").notNull().default(""),
    inn: text("inn").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    links: jsonb("links").$type<SellerLink[]>().notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("seller_info_single_row", sql`${table.id} = 1`)],
);

export type IAboutPage = typeof aboutPage.$inferSelect;
export type ISellerInfo = typeof sellerInfo.$inferSelect;
