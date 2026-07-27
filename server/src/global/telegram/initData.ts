import { validate } from "@telegram-apps/init-data-node";
import { InvalidInitDataError } from "@global/errors";

// Сколько секунд initData считается свежей (защита от replay старых данных).
const EXPIRES_IN_SECONDS = 3600;

export type TelegramUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
};

export type VerifiedInitData = {
  user: TelegramUser;
  startParam?: string;
};

// Сырой пользователь из поля `user` (JSON в query-строке initData, snake_case).
type RawTelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

/**
 * Достаёт initData из заголовка `Authorization: tma <initData>`.
 * Заголовка нет или он другого вида — значит личность не подтверждена (401).
 */
export function initDataFromHeader(authHeader: string | undefined): string {
  if (!authHeader?.startsWith("tma ")) {
    throw new InvalidInitDataError("Нет данных Telegram в заголовке");
  }
  return authHeader.slice(4);
}

/**
 * Проверяет подпись и свежесть initData Telegram Mini App по `BOT_TOKEN`.
 * Криптопроверка (HMAC + hash) — в библиотеке `@telegram-apps/init-data-node`.
 * После успешной проверки строка доверенная, поэтому разбираем её сами через
 * URLSearchParams (у библиотечного `parse` runtime-формат расходится с типами).
 * Бросает `InvalidInitDataError` (401), если данные поддельны, протухли или без пользователя.
 */
export function verifyInitData(initDataRaw: string): VerifiedInitData {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new InvalidInitDataError("BOT_TOKEN не настроен на сервере");
  }

  try {
    validate(initDataRaw, token, { expiresIn: EXPIRES_IN_SECONDS });
  } catch {
    throw new InvalidInitDataError();
  }

  const params = new URLSearchParams(initDataRaw);
  const userRaw = params.get("user");
  if (!userRaw) {
    throw new InvalidInitDataError("В данных Telegram нет пользователя");
  }

  let user: RawTelegramUser;
  try {
    user = JSON.parse(userRaw) as RawTelegramUser;
  } catch {
    throw new InvalidInitDataError("Не удалось разобрать пользователя Telegram");
  }

  if (typeof user.id !== "number" || !user.first_name) {
    throw new InvalidInitDataError("Неполные данные пользователя Telegram");
  }

  return {
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
    },
    startParam: params.get("start_param") ?? undefined,
  };
}
