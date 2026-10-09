import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import { adminHeaders, customerHeaders } from "../../test/e2e/auth";
import { db } from "@global/database/DatabaseSingleton";
import { aboutPage, sellerInfo } from "@global/database/shema";
import type { AboutResponse } from "./helpers";

const app = createApp();

async function getAbout(): Promise<{ status: number; body: AboutResponse }> {
  const res = await app.fetch(new Request("http://localhost/content/about"));
  return { status: res.status, body: (await res.json()) as AboutResponse };
}

const FILLED = {
  title: "Как я начала вязать",
  body: "Первый абзац.\n\nВторой абзац\nс переносом.",
  fullName: "Иванова Мария Петровна",
  inn: "123456789012",
  phone: "+7 (999) 123-45-67",
  email: "maria@example.com",
  links: JSON.stringify([
    { label: "Telegram", url: "https://t.me/skazka" },
    { label: "VK", url: "https://vk.com/skazka" },
  ]),
};

function aboutForm(fields: Record<string, string>, files: File[] = []): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  for (const file of files) form.append("image", file);
  return form;
}

async function patchAbout(form: FormData, headers: Record<string, string> = adminHeaders()) {
  return app.fetch(
    new Request("http://localhost/content/about", { method: "PATCH", body: form, headers }),
  );
}

async function expectInvalid(fields: Record<string, string>, messagePart: string) {
  const res = await patchAbout(aboutForm({ ...FILLED, ...fields }));
  const body = (await res.json()) as { error: unknown; code?: string };
  expect(res.status).toBe(400);
  expect(body.code).toBe("INVALID_ABOUT");
  expect(typeof body.error).toBe("string");
  expect(body.error as string).toContain(messagePart);
}

describe("About E2E", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("GET /content/about до первого сохранения — пустые значения", async () => {
    const { status, body } = await getAbout();

    expect(status).toBe(200);
    expect(body).toEqual({
      about: { title: "", body: "", images: [] },
      seller: { fullName: "", inn: "", phone: "", email: "", links: [] },
    });
  });

  it("PATCH /content/about сохраняет, GET отдаёт сохранённое", async () => {
    const res = await patchAbout(aboutForm(FILLED));
    expect(res.status).toBe(200);

    const expected = {
      about: { title: FILLED.title, body: FILLED.body, images: [] },
      seller: {
        fullName: FILLED.fullName,
        inn: FILLED.inn,
        phone: FILLED.phone,
        email: FILLED.email,
        links: JSON.parse(FILLED.links),
      },
    };
    expect(await res.json()).toEqual(expected);
    expect((await getAbout()).body).toEqual(expected);
  });

  it("повторный PATCH перезаписывает, строка в каждой таблице одна", async () => {
    await patchAbout(aboutForm(FILLED));
    await patchAbout(aboutForm({ ...FILLED, title: "Новый заголовок" }));

    expect((await getAbout()).body.about.title).toBe("Новый заголовок");
    expect(await db.select().from(aboutPage)).toHaveLength(1);
    expect(await db.select().from(sellerInfo)).toHaveLength(1);
  });

  it("PATCH — полная замена: непришедшие поля становятся пустыми", async () => {
    await patchAbout(aboutForm(FILLED));
    const { phone, links, ...rest } = FILLED;
    await patchAbout(aboutForm(rest));

    const { body } = await getAbout();
    expect(body.seller.phone).toBe("");
    expect(body.seller.links).toEqual([]);
    expect(body.seller.fullName).toBe(FILLED.fullName);
  });

  it("заголовок и ФИО обрезаются по краям, \\r\\n в тексте становится \\n", async () => {
    await patchAbout(
      aboutForm({ title: "  Заголовок  ", fullName: " Иванова ", body: "Раз.\r\n\r\nДва." }),
    );

    const { body } = await getAbout();
    expect(body.about.title).toBe("Заголовок");
    expect(body.seller.fullName).toBe("Иванова");
    expect(body.about.body).toBe("Раз.\n\nДва.");
  });

  it("без авторизации → 401, не админ → 403", async () => {
    expect((await patchAbout(aboutForm(FILLED), {})).status).toBe(401);
    expect((await patchAbout(aboutForm(FILLED), customerHeaders())).status).toBe(403);
  });

  it("невалидный ИНН → 400 с понятным текстом", async () => {
    await expectInvalid({ inn: "1234567890" }, "ИНН");
    await expectInvalid({ inn: "12345678901a" }, "ИНН");
  });

  it("пустой ИНН и пустая почта допустимы", async () => {
    const res = await patchAbout(aboutForm({ ...FILLED, inn: "", email: "" }));
    expect(res.status).toBe(200);
  });

  it("кривая почта → 400", async () => {
    await expectInvalid({ email: "maria@" }, "почт");
  });

  it("ссылка не на http(s) → 400, в том числе с пробелами и в верхнем регистре", async () => {
    await expectInvalid(
      { links: JSON.stringify([{ label: "x", url: "javascript:alert(1)" }]) },
      "http",
    );
    await expectInvalid(
      { links: JSON.stringify([{ label: "x", url: "  JAVASCRIPT:alert(1)" }]) },
      "http",
    );
  });

  it("ссылок больше пяти → 400", async () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ label: `L${i}`, url: `https://e.com/${i}` }));
    await expectInvalid({ links: JSON.stringify(six) }, "5");
  });

  it("links не JSON → 400", async () => {
    await expectInvalid({ links: "{не json" }, "ссылок");
  });

  it("слишком длинные заголовок и текст → 400", async () => {
    await expectInvalid({ title: "я".repeat(121) }, "Заголовок");
    await expectInvalid({ body: "я".repeat(10_001) }, "Текст");
  });

  // /about — страница витрины: API на этом пути отдавал бы JSON вместо index.html
  // при обновлении страницы и обходил SEO-middleware.
  it("GET /about не занят API — путь страницы витрины", async () => {
    const res = await app.fetch(new Request("http://localhost/about"));

    expect(res.status).toBe(404);
  });
});
