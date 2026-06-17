import { Hono } from "hono";
import { createOrderValidator } from "../validators/orderValidator";
import { OrderService } from "../global/services/orders/Order.service";
const app = new Hono();

app.post("/create", createOrderValidator, async (c) => {
  const body = await c.req.parseBody();

  const order = await OrderService.createOrder(body);

  return c.json(order);
});

export default app;
