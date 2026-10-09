import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import { adminHeaders, customerHeaders } from "../../test/e2e/auth";
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
