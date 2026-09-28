import { and, desc, eq, getTableColumns, isNull, lt } from "drizzle-orm";
import { db, type DB } from "../DatabaseSingleton";
import { orders, users } from "../shema";
import type { INewOrder, IOrder } from "../shema";
import type { OrderView } from "../types";

// Заказ + телеграм-профиль покупателя: id нужен для уведомлений, username и
// имя — чтобы владелица могла написать клиенту из CRM.
const orderView = {
  ...getTableColumns(orders),
  telegramId: users.telegramId,
  telegramUsername: users.username,
  telegramFirstName: users.firstName,
  telegramLastName: users.lastName,
};

export class OrderMethods {
  static async create(data: INewOrder, conn: DB = db): Promise<IOrder> {
    const [row] = await conn.insert(orders).values(data).returning();
    return row!;
  }

  // Новые сверху — в CRM важны свежие заказы.
  static getList(): Promise<OrderView[]> {
    return db
      .select(orderView)
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));
  }

  static async getById(id: string): Promise<OrderView | null> {
    const [row] = await db
      .select(orderView)
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, id))
      .limit(1);
    return row ?? null;
  }

  /** Смена статуса, если он всё ещё expectedFrom. null — заказа нет или статус успел смениться. */
  static async updateStatus(
    id: string,
    status: IOrder["status"],
    expectedFrom: IOrder["status"],
  ): Promise<IOrder | null> {
    const [row] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.status, expectedFrom)))
      .returning();
    return row ?? null;
  }

  // По номеру приходят уведомления Робокассы (InvId).
  static async getByNumber(number: number): Promise<OrderView | null> {
    const [row] = await db
      .select(orderView)
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.number, number))
      .limit(1);
    return row ?? null;
  }

  /** created → paid. null — заказ уже не ждёт оплаты (оплачен раньше или отменён). */
  static async markPaid(
    id: string,
    data: { paidAt: Date; paymentMethod: string | null },
  ): Promise<IOrder | null> {
    const [row] = await db
      .update(orders)
      .set({ status: "paid", paidAt: data.paidAt, paymentMethod: data.paymentMethod, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.status, "created")))
      .returning();
    return row ?? null;
  }

  /** Оплата уже отменённого заказа: фиксируем один раз, повторы уведомления — без эффекта. */
  static async recordLatePayment(
    id: string,
    data: { paidAt: Date; paymentMethod: string | null },
  ): Promise<IOrder | null> {
    const [row] = await db
      .update(orders)
      .set({ paidAt: data.paidAt, paymentMethod: data.paymentMethod, updatedAt: new Date() })
      .where(and(eq(orders.id, id), isNull(orders.paidAt)))
      .returning();
    return row ?? null;
  }

  // Заказы без срока (payment_expires_at = null) сюда не попадают: null < now — не true.
  static getExpiredUnpaid(now: Date): Promise<OrderView[]> {
    return db
      .select(orderView)
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(and(eq(orders.status, "created"), lt(orders.paymentExpiresAt, now)));
  }

  /** created → cancelled. null — заказ успели оплатить или отменить. */
  static async cancelUnpaid(id: string, conn: DB = db): Promise<IOrder | null> {
    const [row] = await conn
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.status, "created")))
      .returning();
    return row ?? null;
  }
}
