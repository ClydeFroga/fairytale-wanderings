import { describe, it, expect } from "bun:test";
import fs from "fs";
import { checkDocument, contentDisposition, documentExtension } from "./documents";
import { Upload } from "./upload";
import { InvalidDocumentError } from "@global/errors";
import { docxFile, pdfFile } from "../../test/e2e/documents";

function fileWith(bytes: number[], name: string): File {
  const data = new Uint8Array(32);
  data.set(bytes);
  return new File([data], name);
}

async function rejection(file: File): Promise<InvalidDocumentError> {
  try {
    await checkDocument(file);
  } catch (error) {
    if (error instanceof InvalidDocumentError) return error;
    throw error;
  }
  throw new Error("checkDocument пропустил файл");
}

describe("documentExtension", () => {
  it("берёт расширение в нижнем регистре и только из списка", () => {
    expect(documentExtension("Оферта (финал).PDF")).toBe("pdf");
    expect(documentExtension("policy.docx")).toBe("docx");
    expect(documentExtension("virus.exe")).toBeNull();
    expect(documentExtension("noext")).toBeNull();
    // Ключи прототипа объекта расширением не считаются.
    expect(documentExtension("x.constructor")).toBeNull();
  });
});

describe("checkDocument", () => {
  it("пропускает каждый разрешённый формат с верной сигнатурой", async () => {
    expect(await checkDocument(pdfFile("a.pdf"))).toBe("pdf");
    expect(await checkDocument(docxFile("a.docx"))).toBe("docx");
    expect(await checkDocument(fileWith([0x50, 0x4b, 0x03, 0x04], "a.odt"))).toBe("odt");
    expect(
      await checkDocument(fileWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], "a.doc")),
    ).toBe("doc");
    expect(await checkDocument(fileWith([0x7b, 0x5c, 0x72, 0x74, 0x66], "a.rtf"))).toBe("rtf");
  });

  it("расширение в верхнем регистре проходит", async () => {
    expect(await checkDocument(pdfFile("ОФЕРТА.PDF"))).toBe("pdf");
  });

  it("чужое расширение — ошибка про формат", async () => {
    const error = await rejection(fileWith([0x4d, 0x5a], "setup.exe"));
    expect(error.code).toBe("INVALID_DOCUMENT");
    expect(error.message).toContain("PDF, DOC, DOCX, ODT или RTF");
  });

  it("HTML, переименованный в .pdf, — ошибка про содержимое", async () => {
    const html = new File(["<html><script>alert(1)</script></html>"], "offer.pdf");
    expect((await rejection(html)).message).toContain("не того формата");
  });

  it("файл короче сигнатуры — ошибка про содержимое", async () => {
    expect((await rejection(new File(["%P"], "a.pdf"))).message).toContain("не того формата");
  });

  it("больше 10 МБ — ошибка про размер", async () => {
    const error = await rejection(pdfFile("big.pdf", 10 * 1024 * 1024 + 1));
    expect(error.message).toContain("10 МБ");
  });

  it("ровно 10 МБ проходит", async () => {
    expect(await checkDocument(pdfFile("edge.pdf", 10 * 1024 * 1024))).toBe("pdf");
  });
});

describe("contentDisposition", () => {
  it("PDF открывается в браузере, остальное скачивается; кириллица — в filename*", () => {
    expect(contentDisposition("pdf", "offer", "Публичная оферта")).toBe(
      `inline; filename="offer.pdf"; filename*=UTF-8''${encodeURIComponent("Публичная оферта.pdf")}`,
    );
    expect(contentDisposition("docx", "privacy", "Политика конфиденциальности")).toStartWith(
      'attachment; filename="privacy.docx"',
    );
  });
});

describe("Upload.saveDocument / filePath", () => {
  it("кладёт файл в docs/ под новым именем с исходным содержимым", async () => {
    const file = pdfFile("Оферта (финал).PDF");
    const relative = await Upload.saveDocument(file, "pdf");

    expect(relative).toMatch(/^docs\/\d+-[0-9a-f]{8}\.pdf$/);
    const full = Upload.filePath(relative)!;
    expect(new Uint8Array(fs.readFileSync(full))).toEqual(new Uint8Array(await file.arrayBuffer()));

    await Upload.removeMany([relative]);
    expect(fs.existsSync(full)).toBe(false);
  });

  it("filePath не выпускает за пределы UPLOAD_PATH", () => {
    expect(Upload.filePath("../etc/passwd")).toBeNull();
    expect(Upload.filePath("docs/x.pdf")).not.toBeNull();
  });
});
