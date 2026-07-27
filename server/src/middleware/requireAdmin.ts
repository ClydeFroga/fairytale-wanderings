import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { ADMIN_COOKIE, readAdminToken } from "@global/auth/adminSession";
import { initDataFromHeader, verifyInitData } from "@global/telegram/initData";
import { UserMethods } from "@global/database/methods/user";
import { isAdmin } from "@global/telegram/admins";
import { ForbiddenError, UnauthorizedError } from "@global/errors";

let disabledWarned = false;

// Локальная разработка в браузере (вне Телеграма) — initData взять негде,
// поэтому есть явный выключатель. В проде переменную не ставить.
function authDisabled(): boolean {
  if (process.env.ADMIN_AUTH_DISABLED !== "true") return false;

  if (!disabledWarned) {
    console.warn("ADMIN_AUTH_DISABLED=true — проверка прав админа отключена!");
    disabledWarned = true;
  }
  return true;
}

/**
 * Пускает дальше только владелицу магазина. Две равноправные проверки:
 * 1. кука сессии (`admin_session`) — её ставит `POST /auth/login`;
 * 2. свежая `initData` в `Authorization: tma <initData>` — первый запрос из Mini App
 *    и запас на случай, если куки заблокированы (WebView, сторонний домен API).
 *
 * Нет ни того, ни другого → 401; личность есть, но не админ → 403.
 */
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  if (authDisabled()) return next();

  const cookie = getCookie(c, ADMIN_COOKIE);
  if (cookie && (await readAdminToken(cookie))) {
    return next();
  }

  const authHeader = c.req.header("Authorization");
  if (authHeader) {
    // Подделанная/протухшая initData → InvalidInitDataError (401) внутри.
    const { user } = verifyInitData(initDataFromHeader(authHeader));
    const dbUser = await UserMethods.getByTelegramId(user.id);
    if (!isAdmin(user.id, dbUser)) throw new ForbiddenError();

    return next();
  }

  throw new UnauthorizedError();
};
