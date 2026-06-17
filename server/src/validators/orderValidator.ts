import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

export const createOrderValidator = zValidator(
  "form",
  z.object({
    items: z.array(
      z.object({
        productId: z.string(),
        quantity: z.number(),
      })
    ),
    deliveryAddress: z.string(),
  })
);
