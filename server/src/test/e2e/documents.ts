import fs from "fs";
import path from "path";

// Минимальные «документы»: проверка смотрит только на расширение, размер и первые байты.
export function pdfFile(name = "Оферта.pdf", size = 64): File {
  const bytes = new Uint8Array(size);
  bytes.set(new TextEncoder().encode("%PDF-1.4\n"));
  return new File([bytes], name, { type: "application/pdf" });
}

export function docxFile(name = "Политика.docx"): File {
  const bytes = new Uint8Array(64);
  bytes.set([0x50, 0x4b, 0x03, 0x04]);
  return new File([bytes], name);
}

/** Сколько файлов лежит в UPLOAD_PATH/docs (каталога может ещё не быть). */
export function docsCount(): number {
  const dir = path.resolve(process.env.UPLOAD_PATH || "", "docs");
  return fs.existsSync(dir) ? fs.readdirSync(dir).length : 0;
}
