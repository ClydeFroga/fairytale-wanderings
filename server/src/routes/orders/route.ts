import { Hono } from "hono";
import { createOrderValidator } from "./validator";
import { ProductMethods } from "../../global/database/methods/product";
import { OrderMethods } from "../../global/database/methods/order";
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

  // Атомарное списание по каждой позиции (условие stock >= qty отсекает гонки)
  for (const item of items) {
    const ok = await ProductMethods.decrementStock(item.productId, item.quantity);
    if (!ok) {
      const product = byId.get(item.productId);
      throw new InsufficientStockError(item.productId, product?.stock ?? 0, item.quantity);
    }
  }

  const order = await OrderMethods.create({
    customerName: input.customerName,
    contact: input.contact,
    deliveryAddress: input.deliveryAddress,
    totalPrice,
    channel: "web",
  });

  await OrderMethods.addItems(items.map((it) => ({ ...it, orderId: order.id })));

  return c.json(order, 201);
});

export default app;
