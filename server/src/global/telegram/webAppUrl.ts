// Адреса Mini App для кнопок бота. Telegram открывает только https —
// без WEBAPP_URL (или в dev без туннеля) кнопку просто не показываем.

/** Путь CRM внутри того же SPA — Mini App открывается сразу на нём. */
const ADMIN_PATH = "admin";

/** Базовый URL магазина. undefined, если WEBAPP_URL не задан. */
export function webAppUrl(): string | undefined {
  const base = process.env.WEBAPP_URL?.trim();
  return base ? base : undefined;
}

/** URL админки (`WEBAPP_URL/admin`). undefined, если WEBAPP_URL не задан. */
export function adminWebAppUrl(): string | undefined {
  const base = webAppUrl();
  if (!base) return undefined;
  return `${base.replace(/\/+$/, "")}/${ADMIN_PATH}`;
}
