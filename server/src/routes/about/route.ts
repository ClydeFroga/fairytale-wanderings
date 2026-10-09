import { Hono } from "hono";
import { AboutPageMethods } from "@global/database/methods/aboutPage";
import { SellerInfoMethods } from "@global/database/methods/sellerInfo";
import { runInTransaction } from "@global/database/transaction";
import { requireAdmin } from "../../middleware/requireAdmin";
import { updateAboutValidator } from "./validator";
import { sellerFromForm, toAboutResponse } from "./helpers";

const app = new Hono();

// Страницу «Обо мне» читают все (витрина и CRM); менять — только владелица.

app.get("/", async (c) => {
  const [about, seller] = await Promise.all([AboutPageMethods.get(), SellerInfoMethods.get()]);
  return c.json(toAboutResponse(about, seller));
});

// Форма сохраняется одной кнопкой — страница и реквизиты пишутся вместе.
app.patch("/", requireAdmin, updateAboutValidator, async (c) => {
  const form = c.req.valid("form");
  const current = await AboutPageMethods.get();
  const images = current?.images ?? [];

  const saved = await runInTransaction(async (tx) => ({
    about: await AboutPageMethods.upsert({ title: form.title, body: form.body, images }, tx),
    seller: await SellerInfoMethods.upsert(sellerFromForm(form), tx),
  }));

  return c.json(toAboutResponse(saved.about, saved.seller));
});

export default app;
