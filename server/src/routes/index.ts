import { Hono } from "hono";
import products from "./products/route";
import orders from "./orders/route";
import users from "./users/route";
import categories from "./categories/route";
import auth from "./auth/route";

const app = new Hono();

app.route("/products", products);
app.route("/orders", orders);
app.route("/users", users);
app.route("/categories", categories);
app.route("/auth", auth);

export default app;
