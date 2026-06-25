import { Hono } from "hono";
import { createOrderValidator } from "./validator";
import { ProductMethods } from "../../global/database/methods/product";
import { OrderMethods } from "../../global/database/methods/order";
import { OrderItemMethods } from "../../global/database/methods/orderItem";
import { runInTransaction } from "../../global/database/transaction";
import {
  InsufficientStockError,
  ProductNotFoundError,
} from "../../global/errors";

const app = new Hono();

app.post("/create", createOrderValidator, async (c) => {
  const input = c.req.valid("json");

  const ids = input.items.map((item) => item.productId);
  const prods = await ProductMethods.getByIds(ids);
  const byId = new Map(prods.map((p) => [p._id, p]));

  // Проверка наличия и существования
  for (const item of input.items) {
    const product = byId.get(item.productId);
    if (!product) throw new ProductNotFoundError(item.productId);
    if (product.stock < item.quantity)
      throw new InsufficientStockError(item.productId, product.stock, item.quantity);
  }

  // Цену фиксируем из БД, а не из запроса клиента
  const items = input.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    price: byId.get(item.productId)!.price,
  }));
  const totalPrice = items.reduce((acc, it) => acc + it.quantity * it.price, 0);

  const order = await runInTransaction(async (tx) => {
    for (const item of items) {
      const ok = await ProductMethods.decrementStock(item.productId, item.quantity, tx);
      if (!ok) {
        const product = byId.get(item.productId);
        throw new InsufficientStockError(item.productId, product?.stock ?? 0, item.quantity);
      }
    }

    const created = await OrderMethods.create(
      {
        customerName: input.customerName,
        contact: input.contact,
        deliveryAddress: input.deliveryAddress,
        totalPrice,
        channel: "web",
      },
      tx,
    );

    await OrderItemMethods.addMany(
      items.map((it) => ({ ...it, orderId: created.id })),
      tx,
    );

    return created;
  });

  return c.json(order, 201);
});

export default app;
