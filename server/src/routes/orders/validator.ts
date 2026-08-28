import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { STATUS_FLOW } from './statusFlow'

// Допустимые значения статуса; какие переходы разрешены — проверяет роут
// (`canTransition`), чтобы клиент получал понятный INVALID_STATUS_TRANSITION.
export const updateOrderStatusValidator = zValidator(
  'json',
  z.object({ status: z.enum([...STATUS_FLOW, 'cancelled'] as const) }),
)

// Способы доставки: пункт выдачи/постамат СДЭК, курьер СДЭК (оба выбираются
// виджетом на витрине) и адрес, введённый покупателем руками.
export const DELIVERY_METHODS = ['cdek_office', 'cdek_door', 'manual'] as const

export const createOrderValidator = zValidator(
  'json',
  z
    .object({
      items: z
        .array(
          z.object({
            productId: z.string(),
            quantity: z.number().int().positive(),
          }),
        )
        .min(1),
      deliveryAddress: z.string().optional(),
      customerName: z.string().optional(),
      contact: z.string().optional(),
      // Почта необязательна: заполнил — проверяем формат, пустую строку не сохраняем.
      email: z.string().trim().toLowerCase().email().optional(),
      // initData Telegram Mini App (raw query-строка). Если есть и валидна —
      // заказ считается телеграм-заказом (см. route.ts).
      initData: z.string().optional(),
      deliveryMethod: z.enum(DELIVERY_METHODS).optional(),
      // Данные выбранной доставки СДЭК: код ПВЗ, код тарифа и стоимость, которую
      // виджет показал покупателю (в сумму заказа не входит, см. route.ts).
      deliveryPointCode: z.string().trim().max(64).optional(),
      deliveryTariffCode: z.number().int().positive().optional(),
      deliveryPrice: z.number().int().nonnegative().max(1_000_000).optional(),
    })
    // У доставки СДЭК адрес не вводят руками — он приходит из виджета вместе
    // с точкой, поэтому требуем их явно: без них заказ нечем отправить.
    .refine((data) => data.deliveryMethod !== 'cdek_office' || Boolean(data.deliveryPointCode), {
      message: 'Для доставки в ПВЗ нужен код пункта выдачи',
      path: ['deliveryPointCode'],
    })
    .refine(
      (data) => !data.deliveryMethod?.startsWith('cdek_') || Boolean(data.deliveryAddress?.trim()),
      { message: 'Для доставки СДЭК нужен адрес', path: ['deliveryAddress'] },
    ),
)
