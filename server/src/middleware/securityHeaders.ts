import { secureHeaders } from "hono/secure-headers";

/**
 * Защитные заголовки (аналог helmet). От дефолтов hono отступаем там, где они
 * ломают магазин:
 * - X-Frame-Options: SAMEORIGIN не пустил бы Mini App в Telegram Web — он
 *   открывает её в iframe. Вместо него frame-ancestors с доменами Telegram.
 * - CORP same-origin резал бы картинки, когда сайт и API на разных портах (dev).
 * - Referrer no-referrer: ключ Яндекс.Карт в виджете СДЭК может быть привязан к
 *   рефереру, поэтому оставляем браузерный дефолт — уходит только origin.
 * - HSTS без includeSubDomains: за поддомены магазина мы не отвечаем.
 */
export const securityHeaders = secureHeaders({
  xFrameOptions: false,
  contentSecurityPolicy: {
    frameAncestors: ["'self'", "https://*.telegram.org"],
  },
  crossOriginResourcePolicy: "same-site",
  referrerPolicy: "strict-origin-when-cross-origin",
  strictTransportSecurity: "max-age=15552000",
});
