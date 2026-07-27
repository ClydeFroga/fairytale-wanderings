import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { sign } from "@telegram-apps/init-data-node";
import { eq } from "drizzle-orm";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import { UserMethods } from "@global/database/methods/user";
import { db } from "@global/database/DatabaseSingleton";
import { users } from "@global/database/shema";

const BOT_TOKEN = "123456:TEST_BOT_TOKEN";
process.env.BOT_TOKEN = BOT_TOKEN;

const app = createApp();

type MeResponse = { telegramId: number; firstName: string; lastName: string | null; phone: string | null; isAdmin: boolean };

function meRequest(initData: string) {
  return app.fetch(
    new Request("http://localhost/users/me", {
      headers: { Authorization: `tma ${initData}` },
    }),
  );
}

describe("Users /me E2E", () => {
  beforeEach(async () => {
    await resetDatabase();
    delete process.env.ADMIN_TELEGRAM_IDS;
  });

  afterEach(() => {
    delete process.env.ADMIN_TELEGRAM_IDS;
  });

  it("GET /users/me — возвращает телефон из профиля (для предзаполнения)", async () => {
    await UserMethods.upsertByTelegram({
      telegramId: 700001,
      firstName: "Аня",
      phone: "+7 (999) 111-22-33",
    });

    const initData = sign(
      { user: { id: 700001, first_name: "Аня" } } as never,
      BOT_TOKEN,
      new Date(),
    );

    const res = await meRequest(initData);
    const me = (await res.json()) as MeResponse;

    expect(res.status).toBe(200);
    expect(me.telegramId).toBe(700001);
    expect(me.phone).toBe("+7 (999) 111-22-33");
  });

  it("GET /users/me — нет профиля: phone=null, имя из initData", async () => {
    const initData = sign(
      { user: { id: 700002, first_name: "Новый" } } as never,
      BOT_TOKEN,
      new Date(),
    );

    const res = await meRequest(initData);
    const me = (await res.json()) as MeResponse;

    expect(res.status).toBe(200);
    expect(me.phone).toBeNull();
    expect(me.firstName).toBe("Новый");
  });

  it("GET /users/me — обычный пользователь не админ", async () => {
    const initData = sign({ user: { id: 700010, first_name: "Гость" } } as never, BOT_TOKEN, new Date());

    const me = (await (await meRequest(initData)).json()) as MeResponse;
    expect(me.isAdmin).toBe(false);
  });

  it("GET /users/me — id из ADMIN_TELEGRAM_IDS даёт isAdmin (без записи в БД)", async () => {
    process.env.ADMIN_TELEGRAM_IDS = "700011, 700012";

    const initData = sign({ user: { id: 700012, first_name: "Хозяйка" } } as never, BOT_TOKEN, new Date());

    const me = (await (await meRequest(initData)).json()) as MeResponse;
    expect(me.isAdmin).toBe(true);
  });

  it("GET /users/me — флаг is_admin в БД даёт isAdmin", async () => {
    await UserMethods.upsertByTelegram({ telegramId: 700013, firstName: "Хозяйка" });
    await db.update(users).set({ isAdmin: true }).where(eq(users.telegramId, 700013));

    const initData = sign({ user: { id: 700013, first_name: "Хозяйка" } } as never, BOT_TOKEN, new Date());

    const me = (await (await meRequest(initData)).json()) as MeResponse;
    expect(me.isAdmin).toBe(true);
  });

  it("GET /users/me — поддельная initData отклоняется (401)", async () => {
    const initData = sign({ user: { id: 700003, first_name: "Fake" } } as never, "999:WRONG", new Date());

    const res = await meRequest(initData);
    expect(res.status).toBe(401);
  });

  it("GET /users/me — без заголовка Authorization → 401", async () => {
    const res = await app.fetch(new Request("http://localhost/users/me"));
    expect(res.status).toBe(401);
  });
});
