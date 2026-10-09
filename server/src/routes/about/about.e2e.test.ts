import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import type { AboutResponse } from "./helpers";

const app = createApp();

async function getAbout(): Promise<{ status: number; body: AboutResponse }> {
  const res = await app.fetch(new Request("http://localhost/content/about"));
  return { status: res.status, body: (await res.json()) as AboutResponse };
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

  // /about — страница витрины: API на этом пути отдавал бы JSON вместо index.html
  // при обновлении страницы и обходил SEO-middleware.
  it("GET /about не занят API — путь страницы витрины", async () => {
    const res = await app.fetch(new Request("http://localhost/about"));

    expect(res.status).toBe(404);
  });
});
