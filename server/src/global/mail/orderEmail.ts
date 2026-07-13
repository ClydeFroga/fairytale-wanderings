import type { IOrder } from "@global/database/shema";
import type { MailMessage } from "./mailer";

export type OrderEmailItem = {
  name: string;
  quantity: number;
  price: number; // цена за единицу на момент заказа
};

const CHANNEL_LABEL: Record<string, string> = {
  web: "Сайт",
  telegram: "Telegram",
};

function formatPrice(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

// Экранирование значений, попадающих в HTML-часть письма (имя, контакт, адрес,
// название товара — приходят от пользователя). Защита от HTML-инъекции.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Формирует письмо владелице о новом заказе: состав, суммы, контакт, доставка. */
export function buildOrderEmail(order: IOrder, items: OrderEmailItem[]): MailMessage {
  const subject = `Новый заказ на сумму ${formatPrice(order.totalPrice)}`;

  const rows = items.map((it) => ({
    name: it.name,
    quantity: it.quantity,
    sum: it.price * it.quantity,
  }));

  const textLines = [
    subject,
    "",
    "Состав заказа:",
    ...rows.map((r) => `— ${r.name} × ${r.quantity} = ${formatPrice(r.sum)}`),
    "",
    `Итого: ${formatPrice(order.totalPrice)}`,
    "",
    `Имя: ${order.customerName || "—"}`,
    `Контакт: ${order.contact || "—"}`,
    `Доставка: ${order.deliveryAddress || "—"}`,
    `Канал: ${CHANNEL_LABEL[order.channel] ?? order.channel}`,
    `Номер заказа: ${order.id}`,
  ];

  const itemRowsHtml = rows
    .map(
      (r) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${escapeHtml(r.name)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${r.quantity}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${formatPrice(r.sum)}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1b140e;max-width:560px;">
      <h2 style="margin:0 0 16px;">Новый заказ</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
        <thead>
          <tr>
            <th style="padding:6px 12px;text-align:left;border-bottom:2px solid #e88630;">Товар</th>
            <th style="padding:6px 12px;text-align:center;border-bottom:2px solid #e88630;">Кол-во</th>
            <th style="padding:6px 12px;text-align:right;border-bottom:2px solid #e88630;">Сумма</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml}</tbody>
      </table>
      <p style="font-size:16px;font-weight:bold;margin:0 0 16px;">
        Итого: ${formatPrice(order.totalPrice)}
      </p>
      <p style="margin:0 0 4px;"><b>Имя:</b> ${escapeHtml(order.customerName || "—")}</p>
      <p style="margin:0 0 4px;"><b>Контакт:</b> ${escapeHtml(order.contact || "—")}</p>
      <p style="margin:0 0 4px;"><b>Доставка:</b> ${escapeHtml(order.deliveryAddress || "—")}</p>
      <p style="margin:0 0 4px;"><b>Канал:</b> ${CHANNEL_LABEL[order.channel] ?? order.channel}</p>
      <p style="margin:16px 0 0;color:#97704e;font-size:12px;">Номер заказа: ${order.id}</p>
    </div>`;

  return { subject, text: textLines.join("\n"), html };
}
