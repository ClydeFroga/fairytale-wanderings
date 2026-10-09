import { Hono } from "hono";
import { AboutPageMethods } from "@global/database/methods/aboutPage";
import { SellerInfoMethods } from "@global/database/methods/sellerInfo";
import { runInTransaction } from "@global/database/transaction";
import { MAX_IMAGES, Upload, resolveKeptImages } from "@global/utils/upload";
import { TooManyImagesError } from "@global/errors";
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
  const currentImages = current?.images ?? [];

  // Итоговая галерея: оставленные клиентом старые фото + только что загруженные.
  const kept = resolveKeptImages(form.existingImages, currentImages);
  const total = kept.length + form.image.length;
  if (total > MAX_IMAGES) {
    throw new TooManyImagesError(MAX_IMAGES, total);
  }

  // Фото трогаем, только если клиент про них что-то сказал (как у товара).
  const imagesTouched = form.image.length > 0 || form.existingImages !== undefined;
  const uploaded = await Upload.saveImages(form.image);
  const images = imagesTouched ? [...kept, ...uploaded] : currentImages;

  let saved;
  try {
    saved = await runInTransaction(async (tx) => ({
      about: await AboutPageMethods.upsert({ title: form.title, body: form.body, images }, tx),
      seller: await SellerInfoMethods.upsert(sellerFromForm(form), tx),
    }));
  } catch (error) {
    // Не сохранилось — только что загруженные файлы никому не нужны.
    await Upload.removeMany(uploaded);
    throw error;
  }

  // Выпавшие из галереи файлы удаляем с диска — уже после успешной записи.
  if (imagesTouched) {
    await Upload.removeMany(currentImages.filter((path) => !kept.includes(path)));
  }

  return c.json(toAboutResponse(saved.about, saved.seller));
});

export default app;
