import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import {
  ADMIN_TELEGRAM_ID,
  adminHeaders,
  customerHeaders,
  sessionCookie,
  signInitData,
} from "../../test/e2e/auth";
import type { ICategory } from "@global/database/shema";

const app = createApp();

function login(headers: Record<string, string>) {
  return app.fetch(
    new Request("http://localhost/auth/login", { method: "POST", headers }),
  );
}

describe("Admin auth E2E", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("POST /auth/login — админ получает сессионную куку", async () => {
    const res = await login(adminHeaders());
    const body = (await res.json()) as { telegramId: number; isAdmin: boolean };

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ telegramId: ADMIN_TELEGRAM_ID, isAdmin: true });

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("admin_session=");
    expect(cookie).toContain("HttpOnly");
  });

  it("POST /auth/login — обычный пользователь Mini App → 403", async () => {
    const res = await login(customerHeaders());
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("POST /auth/login — поддельная initData → 401", async () => {
    adminHeaders(); // выставляем BOT_TOKEN и список админов
    const fake = signInitData(ADMIN_TELEGRAM_ID, "Хозяйка", "999:WRONG");

    const res = await login({ Authorization: `tma ${fake}` });
    expect(res.status).toBe(401);
  });

  it("POST /auth/login — без заголовка → 401", async () => {
    const res = await login({});
    expect(res.status).toBe(401);
  });

  it("кука сессии заменяет initData на защищённых роутах", async () => {
    const cookie = sessionCookie(await login(adminHeaders()));

    const res = await app.fetch(
      new Request("http://localhost/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ name: "Свечи" }),
      }),
    );
    const created = (await res.json()) as ICategory;

    expect(res.status).toBe(201);
    expect(created.slug).toBe("svechi");
  });

  it("чужая/битая кука не пускает (и без initData → 401)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: "admin_session=not.a.jwt" },
        body: JSON.stringify({ name: "Свечи" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("POST /auth/logout — сбрасывает куку", async () => {
    const res = await app.fetch(
      new Request("http://localhost/auth/logout", { method: "POST" }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
