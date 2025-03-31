import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

export const createProductValidator = zValidator(
  "form",
  z.object({
    name: z.string(),
    price: z.string(),
    description: z.string(),
    isActive: z.string().optional(),
  })
);
