import { Hono } from "hono";
import { createOrderValidator } from "./validator";
import { OrderService } from "../../global/services/orders/Order.service";

const app = new Hono();

app.post("/create", createOrderValidator, async (c) => {
  const body = c.req.valid("json");

  const order = await OrderService.createOrder(body);

  return c.json(order);
});

export default app;
