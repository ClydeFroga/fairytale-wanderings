import { sign, verify } from "hono/jwt";

/**
 * Сессия админки: подписанный JWT в httpOnly-куке.
 * Нужен потому, что `initData` Mini App живёт всего час и не обновляется, пока
 * приложение открыто — с кукой владелица может работать в CRM всю смену.
 */
export const ADMIN_COOKIE = "admin_session";

const ALG = "HS256";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

export type AdminSession = {
  telegramId: number;
  firstName: string;
};

// Отдельного секрета можно не задавать: BOT_TOKEN и так секрет и есть везде,
// где работает проверка initData. Без обоих сессии не выдаются вообще.
function getSecret(): string | null {
  return process.env.ADMIN_JWT_SECRET || process.env.BOT_TOKEN || null;
}

export async function issueAdminToken(session: AdminSession): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;

  return sign(
    {
      sub: String(session.telegramId),
      name: session.firstName,
      admin: true,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    },
    secret,
    ALG,
  );
}

/** Проверяет куку сессии. `null` — подпись не сошлась, срок истёк или это не админ. */
export async function readAdminToken(token: string): Promise<AdminSession | null> {
  const secret = getSecret();
  if (!secret) return null;

  try {
    const payload = (await verify(token, secret, ALG)) as {
      sub?: string;
      name?: string;
      admin?: boolean;
    };

    const telegramId = Number(payload.sub);
    if (payload.admin !== true || !Number.isInteger(telegramId)) return null;

    return { telegramId, firstName: payload.name ?? "" };
  } catch {
    // Протухший или поддельный токен — просто не считаем его сессией.
    return null;
  }
}
