import type { IOrder } from "@global/database/shema";

export type OrderStatus = IOrder["status"];

/** Цепочка статусов заказа. `cancelled` живёт вне неё. */
export const STATUS_FLOW = ["created", "paid", "assembled", "shipped", "completed"] as const;

/**
 * Двигать статус можно только вперёд по цепочке (шаг или несколько сразу —
 * например при самовывозе без оплаты) либо в «отменён». Назад, на месте и
 * из финальных состояний — нельзя.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === "cancelled" || from === "completed") return false;
  if (to === "cancelled") return true;

  const fromIndex = STATUS_FLOW.indexOf(from as (typeof STATUS_FLOW)[number]);
  const toIndex = STATUS_FLOW.indexOf(to as (typeof STATUS_FLOW)[number]);

  return fromIndex !== -1 && toIndex > fromIndex;
}
