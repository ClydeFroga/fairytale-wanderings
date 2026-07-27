import type { IOrder, IOrderItem } from "../shema";

/**
 * Заказ вместе с телеграм-профилем покупателя (join на users). Нужен и серверу
 * (отправить уведомление по telegramId), и CRM (написать клиенту в личку).
 * У веб-заказов покупателя в users нет — все поля null.
 */
export type OrderView = IOrder & {
  telegramId: number | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
  telegramLastName: string | null;
};

/** Позиция заказа с названием товара на момент показа (join на products). */
export type OrderItemView = IOrderItem & {
  productName: string | null;
};
