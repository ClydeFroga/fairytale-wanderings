import type { IOrder } from "@global/database/shema";
import { sendCustomerMessage } from "./telegram";

function formatPrice(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

/**
 * Уведомляет клиента, что заказ создан.
 * chatId — Telegram user id (из проверенной initData), для приватного чата = chat_id.
 */
export async function notifyOrderCreated(chatId: number, order: IOrder): Promise<void> {
  const text = [
    "Спасибо за заказ! 🧸",
    `Ваш заказ принят, сумма — ${formatPrice(order.totalPrice)}.`,
    "Мы свяжемся с вами для подтверждения деталей доставки и оплаты.",
  ].join("\n");

  await sendCustomerMessage(chatId, text);
}
