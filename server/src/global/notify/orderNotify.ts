import type { IOrder } from "@global/database/shema";
import { sendCustomerMessage } from "./telegram";

type OrderStatus = IOrder["status"];

function formatPrice(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

/**
 * Уведомляет клиента, что заказ создан.
 * chatId — Telegram user id (из проверенной initData), для приватного чата = chat_id.
 * awaitingPayment — заказ ждёт онлайн-оплаты (иначе владелица свяжется сама).
 */
export async function notifyOrderCreated(
  chatId: number,
  order: IOrder,
  options: { awaitingPayment: boolean },
): Promise<void> {
  const text = options.awaitingPayment
    ? [
        "Спасибо за заказ! 🧸",
        `Заказ №${order.number} на сумму ${formatPrice(order.totalPrice)} ожидает оплаты.`,
        "Как только оплата пройдёт, мы начнём его собирать.",
      ].join("\n")
    : [
        "Спасибо за заказ! 🧸",
        `Ваш заказ №${order.number} принят, сумма — ${formatPrice(order.totalPrice)}.`,
        "Мы свяжемся с вами для подтверждения деталей доставки и оплаты.",
      ].join("\n");

  await sendCustomerMessage(chatId, text);
}

// Что пишем клиенту на каждом шаге. «created» шлёт notifyOrderCreated —
// там текст с суммой и обещанием связаться.
const STATUS_MESSAGES: Record<Exclude<OrderStatus, "created">, string> = {
  paid: "Оплата получена ✅\nНачинаем собирать ваш заказ.",
  assembled: "Заказ собран 📦\nСкоро передадим его в доставку.",
  shipped: "Заказ отправлен 🚚\nКак только он приедет, мы напишем.",
  completed: "Заказ завершён 🧸\nСпасибо, что выбрали «Сказку Странствий»!",
  cancelled: "Заказ отменён.\nЕсли это недоразумение — напишите нам, всё поправим.",
};

/** Уведомляет клиента о смене статуса заказа. Best-effort, как и остальные. */
export async function notifyOrderStatus(chatId: number, order: IOrder): Promise<void> {
  if (order.status === "created") return;

  await sendCustomerMessage(chatId, STATUS_MESSAGES[order.status]);
}
