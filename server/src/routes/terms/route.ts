import { Hono } from "hono";
import { ShopTermsMethods } from "@global/database/methods/shopTerms";
import { SellerInfoMethods } from "@global/database/methods/sellerInfo";
import { requireAdmin } from "../../middleware/requireAdmin";
import { updateTermsValidator } from "./validator";
import { toTermsResponse } from "./helpers";

const app = new Hono();

// Страницу «Покупателям» читают все (витрина и CRM); менять — только владелица.

app.get("/", async (c) => {
  const [terms, seller] = await Promise.all([ShopTermsMethods.get(), SellerInfoMethods.get()]);
  return c.json(toTermsResponse(terms, seller));
});

app.patch("/", requireAdmin, updateTermsValidator, async (c) => {
  const form = c.req.valid("form");
  const saved = await ShopTermsMethods.upsert({
    paymentText: form.payment,
    deliveryText: form.delivery,
    returnsText: form.returns,
  });
  const seller = await SellerInfoMethods.get();
  return c.json(toTermsResponse(saved, seller));
});

export default app;
