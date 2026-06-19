import { Hono } from "hono";
import products from "./products/route";
import orders from "./orders/route";

const app = new Hono();

app.route("/products", products);
app.route("/orders", orders);

export default app;
