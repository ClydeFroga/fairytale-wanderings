import { inArray } from "drizzle-orm";
import { db } from "../../database/DatabaseSingleton";
import { orders, orderItems, products } from "../../database/shema";
import type { IOrder } from "../../database/shema";

export interface CreateOrderInput {
  items: { productId: string; quantity: number }[];
  deliveryAddress?: string;
}

export class OrderService {
  static async createOrder(order: CreateOrderInput): Promise<IOrder> {
    const ids = order.items.map((item) => item.productId);

    const prods = ids.length
      ? await db.select().from(products).where(inArray(products._id, ids))
      : [];

    const priceOf = (id: string) =>
      prods.find((p) => p._id === id)?.price ?? 0;

    // Цену берём из БД, а не из запроса клиента
    const items = order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: priceOf(item.productId),
    }));

    const totalPrice = items.reduce(
      (acc, item) => acc + item.quantity * item.price,
      0
    );

    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(orders)
        .values({
          deliveryAddress: order.deliveryAddress,
          totalPrice,
          channel: "web",
        })
        .returning();

      if (items.length) {
        await tx
          .insert(orderItems)
          .values(items.map((item) => ({ ...item, orderId: created!.id })));
      }

      return created!;
    });
  }
}
