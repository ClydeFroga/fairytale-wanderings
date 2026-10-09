import { Hono } from "hono";
import { AboutPageMethods } from "@global/database/methods/aboutPage";
import { SellerInfoMethods } from "@global/database/methods/sellerInfo";
import { toAboutResponse } from "./helpers";

const app = new Hono();

// Страницу «Обо мне» читают все (витрина и CRM); менять — только владелица.

app.get("/", async (c) => {
  const [about, seller] = await Promise.all([AboutPageMethods.get(), SellerInfoMethods.get()]);
  return c.json(toAboutResponse(about, seller));
});

export default app;
