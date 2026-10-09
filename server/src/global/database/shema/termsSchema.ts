import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";

/** Загруженный документ: путь на диске, исходное имя файла, когда загружен (ISO). */
export type StoredDocument = { path: string; name: string; updatedAt: string };

// Страница «Покупателям»: условия оплаты, доставки и возврата плюс файлы оферты
// и политики ПД. Одна строка на магазин (id = 1), как about_page; появляется при
// первом сохранении из CRM. Контакты здесь не хранятся — их даёт seller_info.
export const shopTerms = pgTable(
  "shop_terms",
  {
    id: smallint("id").primaryKey().default(1),
    paymentText: text("payment_text").notNull().default(""),
    deliveryText: text("delivery_text").notNull().default(""),
    returnsText: text("returns_text").notNull().default(""),
    offer: jsonb("offer").$type<StoredDocument>(), // null — не загружен
    privacy: jsonb("privacy").$type<StoredDocument>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("shop_terms_single_row", sql`${table.id} = 1`)],
);

export type IShopTerms = typeof shopTerms.$inferSelect;
