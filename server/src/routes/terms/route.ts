import { Hono } from "hono";
import { ShopTermsMethods, type ShopTermsData } from "@global/database/methods/shopTerms";
import { SellerInfoMethods } from "@global/database/methods/sellerInfo";
import { Upload } from "@global/utils/upload";
import { checkDocument } from "@global/utils/documents";
import { requireAdmin } from "../../middleware/requireAdmin";
import { updateTermsValidator } from "./validator";
import {
  documentFileResponse,
  nextDocument,
  staleDocumentPath,
  toTermsResponse,
  type DocumentKind,
} from "./helpers";

const app = new Hono();

// Страницу «Покупателям» читают все (витрина и CRM); менять — только владелица.

app.get("/", async (c) => {
  const [terms, seller] = await Promise.all([ShopTermsMethods.get(), SellerInfoMethods.get()]);
  return c.json(toTermsResponse(terms, seller));
});

// Постоянные адреса файлов: ссылку дают модератору Робокассы и ставят в подвал,
// а владелица может заменить файл — адрес от этого не меняется.
app.get("/:kind{offer|privacy}", async (c) => {
  const kind = c.req.param("kind") as DocumentKind;
  const terms = await ShopTermsMethods.get();
  return documentFileResponse(kind, terms?.[kind]);
});

app.patch("/", requireAdmin, updateTermsValidator, async (c) => {
  const form = c.req.valid("form");

  // Оба файла проверяем до записи на диск: плохой второй не должен оставить первый сиротой.
  const offer = form.offer ? { file: form.offer, ext: await checkDocument(form.offer) } : null;
  const privacy = form.privacy
    ? { file: form.privacy, ext: await checkDocument(form.privacy) }
    : null;

  const current = await ShopTermsMethods.get();
  const uploaded: string[] = [];

  let saved;
  try {
    const nextOffer = await nextDocument(offer, form.removeOffer, uploaded);
    const nextPrivacy = await nextDocument(privacy, form.removePrivacy, uploaded);
    const data: ShopTermsData = {
      paymentText: form.payment,
      deliveryText: form.delivery,
      returnsText: form.returns,
      // undefined — документ не трогаем, поэтому ключ не передаём вовсе.
      ...(nextOffer !== undefined && { offer: nextOffer }),
      ...(nextPrivacy !== undefined && { privacy: nextPrivacy }),
    };
    saved = await ShopTermsMethods.upsert(data);
  } catch (error) {
    // Не сохранилось — только что записанные файлы никому не нужны.
    await Upload.removeMany(uploaded);
    throw error;
  }

  // Заменённые и удалённые файлы стираем с диска уже после успешной записи.
  const stale = [
    staleDocumentPath(current?.offer, saved.offer),
    staleDocumentPath(current?.privacy, saved.privacy),
  ].filter((path): path is string => path !== null);
  await Upload.removeMany(stale);

  const seller = await SellerInfoMethods.get();
  return c.json(toTermsResponse(saved, seller));
});

export default app;
