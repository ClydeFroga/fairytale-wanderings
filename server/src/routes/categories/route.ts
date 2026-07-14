import { Hono } from "hono";
import { CategoryMethods } from "@global/database/methods/category";

const app = new Hono();

app.get("/", async (c) => {
  const categories = await CategoryMethods.getList();
  return c.json(categories);
});

export default app;
