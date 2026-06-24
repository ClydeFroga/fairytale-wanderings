import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

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
  }),
)
