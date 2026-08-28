import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./userSchema";
import { products } from "./productSchema";

// Флоу заказа: создан → оплачен → собран → отправлен → завершён.
// `cancelled` — отмена вне цепочки, возможна с любого шага до завершения.
export const orderStatus = pgEnum("order_status", [
  "created",
  "paid",
  "assembled",
  "shipped",
  "completed",
  "cancelled",
]);

export const orderChannel = pgEnum("order_channel", ["web", "telegram"]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id), // null для веб-заказов (гостевой checkout)
  customerName: text("customer_name"),
  contact: text("contact"), // телефон
  email: text("email"), // необязательная почта — второй канал связи для веб-заказов
  // Способ доставки: cdek_office (ПВЗ/постамат), cdek_door (курьер СДЭК) или
  // manual (адрес введён руками). Заполняется checkout-ом, см. routes/orders.
  deliveryMethod: text("delivery_method"),
  deliveryAddress: text("delivery_address"),
  deliveryPointCode: text("delivery_point_code"), // код ПВЗ СДЭК — только для cdek_office
  deliveryTariffCode: integer("delivery_tariff_code"), // тариф СДЭК — пригодится при создании накладной
  // Стоимость доставки, которую виджет показал покупателю. В totalPrice не входит
  // (там только товары) и на сервере пока не пересчитывается — см. PLAN.md, Этап 6.
  deliveryPrice: integer("delivery_price"),
  comment: text("comment"),
  totalPrice: integer("total_price").notNull().default(0),
  status: orderStatus("status").notNull().default("created"),
  paymentMethod: text("payment_method"),
  channel: orderChannel("channel").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products._id),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(), // фиксируем цену на момент заказа
});

export type IOrder = typeof orders.$inferSelect;
export type INewOrder = typeof orders.$inferInsert;
export type IOrderItem = typeof orderItems.$inferSelect;
export type INewOrderItem = typeof orderItems.$inferInsert;
