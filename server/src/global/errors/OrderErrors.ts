import { AppError } from "./AppError";
import type { IOrder } from "@global/database/shema";

type OrderStatus = IOrder["status"];

export class OrderNotFoundError extends AppError {
  constructor(public readonly orderId: string) {
    super(`Заказ не найден: ${orderId}`, 404, "ORDER_NOT_FOUND", { orderId });
  }
}

/** Статус можно двигать только вперёд по цепочке или в «отменён». */
export class InvalidStatusTransitionError extends AppError {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(
      `Недопустимый переход статуса: ${from} → ${to}`,
      409,
      "INVALID_STATUS_TRANSITION",
      { from, to },
    );
  }
}
