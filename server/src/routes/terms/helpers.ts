import type { IShopTerms, ISellerInfo, StoredDocument } from "@global/database/shema";
import type { SellerInfoData } from "@global/database/methods/sellerInfo";
import { DocumentNotFoundError } from "@global/errors";
import { Upload } from "@global/utils/upload";
import {
  DOCUMENT_TYPES,
  contentDisposition,
  documentExtension,
  type DocumentExtension,
} from "@global/utils/documents";
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

/** Файл из формы, уже прошедший checkDocument. */
export type CheckedDocument = { file: File; ext: DocumentExtension };

/** Как документ называется в скачанном файле. */
const DOCUMENT_TITLES: Record<DocumentKind, string> = {
  offer: "Публичная оферта",
  privacy: "Политика конфиденциальности",
};

/**
 * Новое значение колонки документа.
 * Пришёл файл — сохраняем его на диск (путь добавляем в `uploaded`, чтобы роут
 * мог откатить при ошибке записи). Флаг удаления — null. Иначе undefined:
 * документ не трогаем. Файл важнее флага.
 */
export async function nextDocument(
  incoming: CheckedDocument | null,
  remove: boolean,
  uploaded: string[],
): Promise<StoredDocument | null | undefined> {
  if (incoming) {
    const path = await Upload.saveDocument(incoming.file, incoming.ext);
    uploaded.push(path);
    return { path, name: incoming.file.name, updatedAt: new Date().toISOString() };
  }
  return remove ? null : undefined;
}

/** Старый файл, который после записи больше никому не нужен (заменён или удалён). */
export function staleDocumentPath(
  before: StoredDocument | null | undefined,
  after: StoredDocument | null | undefined,
): string | null {
  return before && before.path !== after?.path ? before.path : null;
}

/** Ответ с самим файлом документа или 404, если его нет (не загружали или пропал с диска). */
export async function documentFileResponse(
  kind: DocumentKind,
  doc: StoredDocument | null | undefined,
): Promise<Response> {
  const ext = doc ? documentExtension(doc.path) : null;
  const fullPath = doc ? Upload.filePath(doc.path) : null;
  if (!ext || !fullPath) throw new DocumentNotFoundError();

  const file = Bun.file(fullPath);
  if (!(await file.exists())) throw new DocumentNotFoundError();

  return new Response(file, {
    headers: {
      "Content-Type": DOCUMENT_TYPES[ext].mime,
      "Content-Disposition": contentDisposition(ext, kind, DOCUMENT_TITLES[kind]),
      // Адрес постоянный, а файл владелица может заменить — кэшу верить нельзя.
      "Cache-Control": "no-cache",
    },
  });
}
