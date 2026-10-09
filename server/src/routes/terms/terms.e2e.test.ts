import { describe, it, expect, beforeEach } from "bun:test";
import fs from "fs";
import { ShopTermsMethods } from "@global/database/methods/shopTerms";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import { adminHeaders, customerHeaders } from "../../test/e2e/auth";
import { docsCount, docxFile, pdfFile } from "../../test/e2e/documents";
import { uploadedPath } from "../../test/e2e/images";
import type { TermsResponse } from "./helpers";

const app = createApp();

const TEXTS = {
  payment: "Картой или по СБП.\n\nЧек придёт на почту.",
  delivery: "СДЭК до пункта выдачи.",
  returns: "7 дней после получения.",
};

async function getTerms(): Promise<{ status: number; body: TermsResponse }> {
  const res = await app.fetch(new Request("http://localhost/content/terms"));
  return { status: res.status, body: (await res.json()) as TermsResponse };
}

function termsForm(fields: Record<string, string>, files: Record<string, File> = {}): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  for (const [key, file] of Object.entries(files)) form.set(key, file);
  return form;
}

async function patchTerms(form: FormData, headers: Record<string, string> = adminHeaders()) {
  return app.fetch(
    new Request("http://localhost/content/terms", { method: "PATCH", body: form, headers }),
  );
}

describe("Terms E2E — тексты", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("GET до первого сохранения — пустые значения", async () => {
    const { status, body } = await getTerms();

    expect(status).toBe(200);
    expect(body).toEqual({
      payment: "",
      delivery: "",
      returns: "",
      offer: null,
      privacy: null,
      seller: { fullName: "", inn: "", phone: "", email: "", links: [] },
    });
  });

  it("PATCH сохраняет тексты, GET отдаёт сохранённое", async () => {
    const res = await patchTerms(termsForm(TEXTS));
    expect(res.status).toBe(200);
    expect(((await res.json()) as TermsResponse).payment).toBe(TEXTS.payment);

    const { body } = await getTerms();
    expect(body.payment).toBe(TEXTS.payment);
    expect(body.delivery).toBe(TEXTS.delivery);
    expect(body.returns).toBe(TEXTS.returns);
  });

  it("повторный PATCH перезаписывает, непришедшее поле — пустая строка", async () => {
    await patchTerms(termsForm(TEXTS));
    await patchTerms(termsForm({ payment: "Только СБП" }));

    const { body } = await getTerms();
    expect(body.payment).toBe("Только СБП");
    expect(body.delivery).toBe("");
    expect(body.returns).toBe("");
  });

  it("\\r\\n сохраняется как \\n, пробелы по краям не срезаются", async () => {
    await patchTerms(termsForm({ payment: "  Раз\r\n\r\nДва  " }));
    expect((await getTerms()).body.payment).toBe("  Раз\n\nДва  ");
  });

  it("текст длиннее 10 000 символов — 400 INVALID_TERMS с текстом", async () => {
    const res = await patchTerms(termsForm({ ...TEXTS, delivery: "а".repeat(10_001) }));
    const body = (await res.json()) as { error: unknown; code?: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("INVALID_TERMS");
    expect(typeof body.error).toBe("string");
    expect(body.error as string).toContain("10 000");
  });

  it("без авторизации — 401, не админ — 403", async () => {
    expect((await patchTerms(termsForm(TEXTS), {})).status).toBe(401);
    expect((await patchTerms(termsForm(TEXTS), customerHeaders())).status).toBe(403);
    expect((await getTerms()).body.payment).toBe("");
  });

  it("seller — те же реквизиты, что сохранены через «Обо мне»", async () => {
    const about = new FormData();
    about.set("fullName", "Иванова Мария Петровна");
    about.set("inn", "123456789012");
    about.set("phone", "+7 (999) 123-45-67");
    about.set("email", "maria@example.com");
    about.set("links", JSON.stringify([{ label: "Telegram", url: "https://t.me/skazka" }]));
    const saved = await app.fetch(
      new Request("http://localhost/content/about", {
        method: "PATCH",
        body: about,
        headers: adminHeaders(),
      }),
    );
    expect(saved.status).toBe(200);

    expect((await getTerms()).body.seller).toEqual({
      fullName: "Иванова Мария Петровна",
      inn: "123456789012",
      phone: "+7 (999) 123-45-67",
      email: "maria@example.com",
      links: [{ label: "Telegram", url: "https://t.me/skazka" }],
    });
  });
});

async function getDocument(kind: "offer" | "privacy") {
  return app.fetch(new Request(`http://localhost/content/terms/${kind}`));
}

async function storedPath(kind: "offer" | "privacy"): Promise<string> {
  const row = await ShopTermsMethods.get();
  const doc = row?.[kind];
  if (!doc) throw new Error(`документ ${kind} не сохранён`);
  return doc.path;
}

async function expectInvalidDocument(file: File, messagePart: string) {
  const before = docsCount();
  const res = await patchTerms(termsForm(TEXTS, { offer: file }));
  const body = (await res.json()) as { error: string; code?: string };

  expect(res.status).toBe(400);
  expect(body.code).toBe("INVALID_DOCUMENT");
  expect(body.error).toContain(messagePart);
  expect(docsCount()).toBe(before);
}

describe("Terms E2E — документы", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("загрузка оферты: имя и дата в GET, файл по постоянному адресу, PDF — inline", async () => {
    const file = pdfFile("Оферта.pdf");
    const res = await patchTerms(termsForm(TEXTS, { offer: file }));
    expect(res.status).toBe(200);

    const { body } = await getTerms();
    expect(body.offer?.name).toBe("Оферта.pdf");
    expect(Number.isNaN(Date.parse(body.offer!.updatedAt))).toBe(false);
    expect(body.privacy).toBeNull();

    const doc = await getDocument("offer");
    expect(doc.status).toBe(200);
    expect(doc.headers.get("content-type")).toBe("application/pdf");
    expect(doc.headers.get("content-disposition")).toBe(
      `inline; filename="offer.pdf"; filename*=UTF-8''${encodeURIComponent("Публичная оферта.pdf")}`,
    );
    expect(doc.headers.get("cache-control")).toBe("no-cache");
    expect(new Uint8Array(await doc.arrayBuffer())).toEqual(new Uint8Array(await file.arrayBuffer()));
  });

  it("политика в DOCX — attachment с типом docx", async () => {
    await patchTerms(termsForm(TEXTS, { privacy: docxFile() }));

    const doc = await getDocument("privacy");
    expect(doc.status).toBe(200);
    expect(doc.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(doc.headers.get("content-disposition")).toStartWith('attachment; filename="privacy.docx"');
  });

  it("кириллица, пробелы и скобки в имени — на диске безопасное имя", async () => {
    const res = await patchTerms(termsForm(TEXTS, { offer: pdfFile("Оферта (финал).PDF") }));
    expect(res.status).toBe(200);

    expect(await storedPath("offer")).toMatch(/^docs\/\d+-[0-9a-f]{8}\.pdf$/);
    expect((await getTerms()).body.offer?.name).toBe("Оферта (финал).PDF");
    expect((await getDocument("offer")).headers.get("content-disposition")).toStartWith(
      'inline; filename="offer.pdf";',
    );
  });

  it("замена файла удаляет старый с диска", async () => {
    await patchTerms(termsForm(TEXTS, { offer: pdfFile("v1.pdf") }));
    const oldPath = uploadedPath(await storedPath("offer"));

    await patchTerms(termsForm(TEXTS, { offer: pdfFile("v2.pdf") }));

    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.existsSync(uploadedPath(await storedPath("offer")))).toBe(true);
    expect((await getTerms()).body.offer?.name).toBe("v2.pdf");
  });

  it("сохранение только текстов не трогает документы", async () => {
    await patchTerms(termsForm(TEXTS, { offer: pdfFile(), privacy: docxFile() }));
    await patchTerms(termsForm({ ...TEXTS, payment: "Новый текст" }));

    const { body } = await getTerms();
    expect(body.payment).toBe("Новый текст");
    expect(body.offer?.name).toBe("Оферта.pdf");
    expect(body.privacy?.name).toBe("Политика.docx");
  });

  it("замена оферты не трогает политику", async () => {
    await patchTerms(termsForm(TEXTS, { offer: pdfFile("v1.pdf"), privacy: docxFile() }));
    const privacyPath = await storedPath("privacy");

    await patchTerms(termsForm(TEXTS, { offer: pdfFile("v2.pdf") }));

    expect(await storedPath("privacy")).toBe(privacyPath);
    expect(fs.existsSync(uploadedPath(privacyPath))).toBe(true);
  });

  it("removeOffer=true удаляет файл и запись, адрес отдаёт 404", async () => {
    await patchTerms(termsForm(TEXTS, { offer: pdfFile() }));
    const path = uploadedPath(await storedPath("offer"));

    const res = await patchTerms(termsForm({ ...TEXTS, removeOffer: "true" }));
    expect(res.status).toBe(200);

    expect((await getTerms()).body.offer).toBeNull();
    expect(fs.existsSync(path)).toBe(false);
    const doc = await getDocument("offer");
    expect(doc.status).toBe(404);
    expect(((await doc.json()) as { code: string }).code).toBe("DOCUMENT_NOT_FOUND");
  });

  it("removeOffer, когда файла нет, — 200", async () => {
    const res = await patchTerms(termsForm({ ...TEXTS, removeOffer: "true" }));
    expect(res.status).toBe(200);
    expect((await getTerms()).body.offer).toBeNull();
  });

  it("файл и флаг удаления вместе — побеждает файл", async () => {
    const res = await patchTerms(termsForm({ ...TEXTS, removeOffer: "true" }, { offer: pdfFile("new.pdf") }));
    expect(res.status).toBe(200);
    expect((await getTerms()).body.offer?.name).toBe("new.pdf");
  });

  it("документа не загружали — 404", async () => {
    expect((await getDocument("privacy")).status).toBe(404);
  });

  it("файл пропал с диска, а запись есть — 404, а не 500", async () => {
    await patchTerms(termsForm(TEXTS, { offer: pdfFile() }));
    fs.rmSync(uploadedPath(await storedPath("offer")));

    const doc = await getDocument("offer");
    expect(doc.status).toBe(404);
    expect(((await doc.json()) as { code: string }).code).toBe("DOCUMENT_NOT_FOUND");
  });

  it("неверное расширение — 400, на диске ничего", async () => {
    await expectInvalidDocument(new File(["MZ"], "setup.exe"), "PDF, DOC, DOCX, ODT или RTF");
  });

  it("HTML, переименованный в .pdf, — 400, на диске ничего", async () => {
    await expectInvalidDocument(new File(["<html></html>"], "offer.pdf"), "не того формата");
  });

  it("больше 10 МБ — 400, на диске ничего", async () => {
    await expectInvalidDocument(pdfFile("big.pdf", 10 * 1024 * 1024 + 1), "10 МБ");
  });

  it("хороший первый и плохой второй файл — 400, первый на диск не попал, старые не тронуты", async () => {
    await patchTerms(termsForm(TEXTS, { offer: pdfFile("v1.pdf") }));
    const before = docsCount();

    const res = await patchTerms(
      termsForm(TEXTS, { offer: pdfFile("v2.pdf"), privacy: new File(["<html>"], "p.docx") }),
    );

    expect(res.status).toBe(400);
    expect(docsCount()).toBe(before);
    expect((await getTerms()).body.offer?.name).toBe("v1.pdf");
  });

  it("без авторизации загрузка не проходит — 401, на диске ничего", async () => {
    const before = docsCount();
    const res = await patchTerms(termsForm(TEXTS, { offer: pdfFile() }), {});
    expect(res.status).toBe(401);
    expect(docsCount()).toBe(before);
  });
});
