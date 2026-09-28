import type { IOrder } from "@global/database/shema";
import type { OrderItemView, OrderView } from "@global/database/types";

export type OrderListItem = {
  productId: string | null;
  name: string;
  quantity: number;
  price: number;
};

/** Телеграм покупателя для CRM: по username можно написать, id — служебный. */
export type OrderTelegram = {
  id: number;
  username: string | null;
  name: string | null;
};

/** Заказ для CRM: сам заказ, его состав и телеграм покупателя (если он есть). */
export type OrderListEntry = IOrder & {
  items: OrderListItem[];
  telegram: OrderTelegram | null;
};

function toTelegram(order: OrderView): OrderTelegram | null {
  if (order.telegramId === null) return null;

  const name = [order.telegramFirstName, order.telegramLastName].filter(Boolean).join(" ");

  return {
    id: order.telegramId,
    username: order.telegramUsername,
    name: name || null,
  };
}

/** Раскладывает позиции по заказам (два запроса вместо N+1). */
export function buildOrderList(orders: OrderView[], items: OrderItemView[]): OrderListEntry[] {
  const byOrderId = new Map<string, OrderListItem[]>();

  for (const item of items) {
    const list = byOrderId.get(item.orderId) ?? [];
    list.push({
      productId: item.productId,
      name: item.productName ?? "Товар удалён",
      quantity: item.quantity,
      price: item.price,
    });
    byOrderId.set(item.orderId, list);
  }

  return orders.map((order) => {
    // Плоские telegram*-поля наружу не отдаём — вместо них собранный объект.
    const { telegramId, telegramUsername, telegramFirstName, telegramLastName, ...rest } = order;

    return {
      ...rest,
      items: byOrderId.get(order.id) ?? [],
      telegram: toTelegram(order),
    };
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Кривой id не должен доходить до Postgres — там это ошибка приведения к uuid. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
