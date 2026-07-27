import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  issueAdminToken,
} from "@global/auth/adminSession";
import { initDataFromHeader, verifyInitData } from "@global/telegram/initData";
import { UserMethods } from "@global/database/methods/user";
import { isAdmin } from "@global/telegram/admins";
import { AppError, ForbiddenError } from "@global/errors";

const app = new Hono();

/**
 * Вход в админку: `Authorization: tma <initData>` из Mini App.
 * Проверяем подпись Телеграма, сверяем права и ставим httpOnly-куку сессии,
 * чтобы дальше CRM работала и после того, как initData протухнет (час).
 */
app.post("/login", async (c) => {
  const { user } = verifyInitData(initDataFromHeader(c.req.header("Authorization")));

  const dbUser = await UserMethods.getByTelegramId(user.id);
  if (!isAdmin(user.id, dbUser)) throw new ForbiddenError();

  const token = await issueAdminToken({ telegramId: user.id, firstName: user.firstName });
  if (!token) {
    // Ни ADMIN_JWT_SECRET, ни BOT_TOKEN — подписать сессию нечем.
    throw new AppError("Сессии админки не настроены на сервере", 500);
  }

  setCookie(c, ADMIN_COOKIE, token, {
    httpOnly: true,
    // Mini App и API могут жить на разных доменах, поэтому кука кросс-сайтовая.
    // SameSite=None требует Secure; на localhost браузеры такие куки принимают.
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return c.json({
    telegramId: user.id,
    firstName: dbUser?.firstName ?? user.firstName,
    isAdmin: true,
  });
});

app.post("/logout", (c) => {
  deleteCookie(c, ADMIN_COOKIE, { path: "/", secure: true, sameSite: "None" });
  return c.json({ message: "Сессия завершена" });
});

export default app;
