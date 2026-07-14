import { Hono } from "hono";
import { verifyInitData } from "@global/telegram/initData";
import { UserMethods } from "@global/database/methods/user";
import { InvalidInitDataError } from "@global/errors";

const app = new Hono();

// Профиль текущего Telegram-пользователя — для предзаполнения формы заказа.
// initData передаётся в заголовке: Authorization: "tma <initData>".
app.get("/me", async (c) => {
  const initData = extractInitData(c.req.header("Authorization"));
  const { user } = verifyInitData(initData);

  const dbUser = await UserMethods.getByTelegramId(user.id);

  return c.json({
    telegramId: user.id,
    firstName: dbUser?.firstName ?? user.firstName,
    lastName: dbUser?.lastName ?? user.lastName ?? null,
    phone: dbUser?.phone ?? null,
  });
});

function extractInitData(authHeader?: string): string {
  if (!authHeader?.startsWith("tma ")) {
    throw new InvalidInitDataError("Нет данных Telegram в заголовке");
  }
  return authHeader.slice(4);
}

export default app;
