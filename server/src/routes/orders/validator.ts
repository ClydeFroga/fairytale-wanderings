import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { STATUS_FLOW } from './statusFlow'

// Допустимые значения статуса; какие переходы разрешены — проверяет роут
// (`canTransition`), чтобы клиент получал понятный INVALID_STATUS_TRANSITION.
export const updateOrderStatusValidator = zValidator(
  'json',
  z.object({ status: z.enum([...STATUS_FLOW, 'cancelled'] as const) }),
)

export const createOrderValidator = zValidator(
  'json',
  z.object({
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
  }),
)
