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

const DELIVERY_LABEL: Record<string, string> = {
  cdek_office: "СДЭК, пункт выдачи",
  cdek_door: "СДЭК, курьером",
  manual: "Адрес покупателя",
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

/**
 * Блок доставки: способ с кодом ПВЗ, адрес и стоимость от виджета СДЭК.
 * У старых заказов способ не заполнен — тогда остаётся только адрес.
 */
function deliveryRows(order: IOrder): Array<[string, string]> {
  const rows: Array<[string, string]> = [];

  if (order.deliveryMethod) {
    const label = DELIVERY_LABEL[order.deliveryMethod] ?? order.deliveryMethod;
    const point = order.deliveryPointCode ? ` (${order.deliveryPointCode})` : "";
    rows.push(["Способ доставки", `${label}${point}`]);
  }

  rows.push(["Доставка", order.deliveryAddress || "—"]);

  if (order.deliveryPrice !== null) {
    rows.push(["Стоимость доставки", `${formatPrice(order.deliveryPrice)} — входит в сумму заказа`]);
  }

  return rows;
}

/**
 * Письмо владелице о заказе: состав, суммы, контакт, доставка.
 * kind = 'new' — заказ без онлайн-оплаты, 'paid' — Робокасса подтвердила оплату.
 */
export function buildOrderEmail(
  order: IOrder,
  items: OrderEmailItem[],
  kind: "new" | "paid" = "new",
): MailMessage {
  const title = kind === "paid" ? `Оплачен заказ №${order.number}` : `Новый заказ №${order.number}`;
  const subject = `${title} на сумму ${formatPrice(order.totalPrice)}`;
  const payment =
    kind === "paid" ? `Оплачен онлайн${order.paymentMethod ? ` (${order.paymentMethod})` : ""}` : null;

  const rows = items.map((it) => ({
    name: it.name,
    quantity: it.quantity,
    sum: it.price * it.quantity,
  }));

  const delivery = deliveryRows(order);

  const textLines = [
    subject,
    "",
    "Состав заказа:",
    ...rows.map((r) => `— ${r.name} × ${r.quantity} = ${formatPrice(r.sum)}`),
    "",
    `Итого: ${formatPrice(order.totalPrice)}`,
    ...(payment ? [`Оплата: ${payment}`] : []),
    "",
    `Имя: ${order.customerName || "—"}`,
    `Телефон: ${order.contact || "—"}`,
    `Почта: ${order.email || "—"}`,
    ...delivery.map(([label, value]) => `${label}: ${value}`),
    `Канал: ${CHANNEL_LABEL[order.channel] ?? order.channel}`,
    `ID заказа: ${order.id}`,
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
      <h2 style="margin:0 0 16px;">${title}</h2>
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
      ${payment ? `<p style="margin:0 0 16px;"><b>Оплата:</b> ${escapeHtml(payment)}</p>` : ""}
      <p style="margin:0 0 4px;"><b>Имя:</b> ${escapeHtml(order.customerName || "—")}</p>
      <p style="margin:0 0 4px;"><b>Телефон:</b> ${escapeHtml(order.contact || "—")}</p>
      <p style="margin:0 0 4px;"><b>Почта:</b> ${escapeHtml(order.email || "—")}</p>
      ${delivery
        .map(
          ([label, value]) =>
            `<p style="margin:0 0 4px;"><b>${label}:</b> ${escapeHtml(value)}</p>`,
        )
        .join("")}
      <p style="margin:0 0 4px;"><b>Канал:</b> ${CHANNEL_LABEL[order.channel] ?? order.channel}</p>
      <p style="margin:16px 0 0;color:#97704e;font-size:12px;">ID заказа: ${order.id}</p>
    </div>`;

  return { subject, text: textLines.join("\n"), html };
}

/**
 * Оплата пришла по уже отменённому заказу (истёк срок или отменили вручную):
 * товар вернулся на склад, деньги у Робокассы — владелице нужно решить вручную.
 */
export function buildLatePaymentEmail(order: IOrder): MailMessage {
  const subject = `Оплачен отменённый заказ №${order.number}`;
  const lines = [
    `Робокасса подтвердила оплату ${formatPrice(order.totalPrice)} за заказ №${order.number},`,
    "но заказ к этому моменту уже был отменён, и товар вернулся на склад.",
    "Оформите возврат в личном кабинете Робокассы или свяжитесь с покупателем.",
    "",
    `Имя: ${order.customerName || "—"}`,
    `Телефон: ${order.contact || "—"}`,
    `Почта: ${order.email || "—"}`,
    `ID заказа: ${order.id}`,
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1b140e;max-width:560px;">
      <h2 style="margin:0 0 16px;">${subject}</h2>
      ${lines
        .filter(Boolean)
        .map((line) => `<p style="margin:0 0 4px;">${escapeHtml(line)}</p>`)
        .join("")}
    </div>`;

  return { subject, text: lines.join("\n"), html };
}
