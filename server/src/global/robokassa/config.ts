// Настройки Робокассы. Всё в .env: пароли №1/№2 знает только сервер, в браузер
// уходит лишь готовая подписанная ссылка на платёжную страницу.

export type RobokassaHash = 'md5' | 'sha1' | 'sha256' | 'sha384' | 'sha512'

export type RobokassaConfig = {
  merchantLogin: string
  password1: string // подпись ссылки на оплату
  password2: string // проверка уведомления об оплате (Result URL)
  isTest: boolean // IsTest=1 — деньги не списываются
  hash: RobokassaHash // должен совпадать с алгоритмом в ЛК Робокассы
  receipt: boolean // передавать ли состав заказа для чека
  tax: string // ставка НДС в чеке
}

const HASHES: RobokassaHash[] = ['md5', 'sha1', 'sha256', 'sha384', 'sha512']
const DEFAULT_TTL_MINUTES = 60

/** null — оплата не настроена: заказы оформляются без онлайн-оплаты, как раньше. */
export function getRobokassaConfig(): RobokassaConfig | null {
  const { ROBOKASSA_MERCHANT_LOGIN, ROBOKASSA_PASSWORD1, ROBOKASSA_PASSWORD2 } = process.env
  if (!ROBOKASSA_MERCHANT_LOGIN || !ROBOKASSA_PASSWORD1 || !ROBOKASSA_PASSWORD2) return null

  const hash = (process.env.ROBOKASSA_HASH || 'md5').toLowerCase() as RobokassaHash
  if (!HASHES.includes(hash)) {
    console.warn(`ROBOKASSA_HASH=${process.env.ROBOKASSA_HASH} не поддерживается — используем md5`)
  }

  return {
    merchantLogin: ROBOKASSA_MERCHANT_LOGIN,
    password1: ROBOKASSA_PASSWORD1,
    password2: ROBOKASSA_PASSWORD2,
    // По умолчанию тестовый режим: боевой включается явно, после активации магазина.
    isTest: process.env.ROBOKASSA_TEST !== 'false',
    hash: HASHES.includes(hash) ? hash : 'md5',
    receipt: process.env.ROBOKASSA_RECEIPT === 'true',
    tax: process.env.ROBOKASSA_TAX || 'none',
  }
}

/** Сколько минут неоплаченный заказ держит товар. */
export function getPaymentTtlMinutes(): number {
  const parsed = Number(process.env.PAYMENT_TTL_MINUTES)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MINUTES
}
