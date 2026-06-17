import { Hono } from "hono";
import products from "./products";
import orders from "./orders";
const app = new Hono();

app.route("/products", products);
app.route("/orders", orders);

export default app;
