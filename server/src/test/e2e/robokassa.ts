export const RK_LOGIN = 'test-shop'
export const RK_PASSWORD1 = 'pass-one'
export const RK_PASSWORD2 = 'pass-two'

export const ROBOKASSA_ENV_KEYS = [
  'ROBOKASSA_MERCHANT_LOGIN',
  'ROBOKASSA_PASSWORD1',
  'ROBOKASSA_PASSWORD2',
  'ROBOKASSA_TEST',
  'ROBOKASSA_HASH',
  'ROBOKASSA_RECEIPT',
  'ROBOKASSA_TAX',
  'PAYMENT_TTL_MINUTES',
]

export function setRobokassaEnv(extra: Record<string, string> = {}) {
  process.env.ROBOKASSA_MERCHANT_LOGIN = RK_LOGIN
  process.env.ROBOKASSA_PASSWORD1 = RK_PASSWORD1
  process.env.ROBOKASSA_PASSWORD2 = RK_PASSWORD2
  Object.assign(process.env, extra)
}

export function clearRobokassaEnv() {
  for (const key of ROBOKASSA_ENV_KEYS) delete process.env[key]
}
