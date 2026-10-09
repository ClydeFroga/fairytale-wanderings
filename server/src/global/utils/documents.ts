import path from "path";
import { InvalidDocumentError } from "@global/errors";

// Оферта и политика ПД загружаются владелицей и отдаются с домена магазина,
// поэтому проверяем не только расширение, но и первые байты: иначе под видом
// .pdf можно было бы положить HTML со скриптом.
export const DOCUMENT_TYPES = {
  pdf: { mime: "application/pdf", signature: [0x25, 0x50, 0x44, 0x46], inline: true },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    signature: [0x50, 0x4b, 0x03, 0x04],
    inline: false,
  },
  odt: {
    mime: "application/vnd.oasis.opendocument.text",
    signature: [0x50, 0x4b, 0x03, 0x04],
    inline: false,
  },
  doc: {
    mime: "application/msword",
    signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
    inline: false,
  },
  rtf: { mime: "application/rtf", signature: [0x7b, 0x5c, 0x72, 0x74, 0x66], inline: false },
} satisfies Record<string, { mime: string; signature: number[]; inline: boolean }>;

export type DocumentExtension = keyof typeof DOCUMENT_TYPES;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Расширение из списка разрешённых (регистр не важен) или null. */
export function documentExtension(name: string): DocumentExtension | null {
  const ext = path.extname(name).slice(1).toLowerCase();
  // Собственный ключ, а не `in`: иначе «x.constructor» сошёл бы за расширение.
  return Object.prototype.hasOwnProperty.call(DOCUMENT_TYPES, ext) ? (ext as DocumentExtension) : null;
}

/** Проверяет файл документа и возвращает его расширение. */
export async function checkDocument(file: File): Promise<DocumentExtension> {
  const ext = documentExtension(file.name);
  if (!ext) throw new InvalidDocumentError("Файл должен быть PDF, DOC, DOCX, ODT или RTF");
  if (file.size > MAX_DOCUMENT_BYTES) throw new InvalidDocumentError("Файл больше 10 МБ");

  const { signature } = DOCUMENT_TYPES[ext];
  const head = new Uint8Array(await file.slice(0, signature.length).arrayBuffer());
  if (head.length < signature.length || signature.some((byte, i) => head[i] !== byte)) {
    throw new InvalidDocumentError("Файл повреждён или не того формата");
  }
  return ext;
}

/**
 * Заголовок для отдачи файла: PDF браузер покажет сам, остальное скачается.
 * `filename` — ASCII-запасной вариант для старых клиентов, `filename*` — имя по-русски.
 */
export function contentDisposition(ext: DocumentExtension, asciiName: string, title: string): string {
  const type = DOCUMENT_TYPES[ext].inline ? "inline" : "attachment";
  return `${type}; filename="${asciiName}.${ext}"; filename*=UTF-8''${encodeURIComponent(`${title}.${ext}`)}`;
}
