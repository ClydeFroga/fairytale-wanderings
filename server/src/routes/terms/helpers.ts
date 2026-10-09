import type { IShopTerms, ISellerInfo, StoredDocument } from "@global/database/shema";
import type { SellerInfoData } from "@global/database/methods/sellerInfo";
import { toSellerResponse } from "../about/helpers";

export type DocumentKind = "offer" | "privacy";

/** Что знает о документе клиент: путь на диске наружу не отдаём. */
export type DocumentInfo = { name: string; updatedAt: string };

/** Ответ GET/PATCH /content/terms. */
export type TermsResponse = {
  payment: string;
  delivery: string;
  returns: string;
  offer: DocumentInfo | null;
  privacy: DocumentInfo | null;
  seller: SellerInfoData;
};

function documentInfo(doc: StoredDocument | null | undefined): DocumentInfo | null {
  return doc ? { name: doc.name, updatedAt: doc.updatedAt } : null;
}

// Строки может ещё не быть (страницу не сохраняли) — тогда всё пустое.
export function toTermsResponse(terms: IShopTerms | null, seller: ISellerInfo | null): TermsResponse {
  return {
    payment: terms?.paymentText ?? "",
    delivery: terms?.deliveryText ?? "",
    returns: terms?.returnsText ?? "",
    offer: documentInfo(terms?.offer),
    privacy: documentInfo(terms?.privacy),
    seller: toSellerResponse(seller),
  };
}
