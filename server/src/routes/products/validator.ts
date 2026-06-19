import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

export const createProductValidator = zValidator(
  "form",
  z.object({
    name: z.string(),
    price: z.string(),
    description: z.string(),
    category: z.string(),
    isActive: z.string().optional(),
    image: z.instanceof(File).optional(),
  })
);

export const updateProductValidator = zValidator(
  "form",
  z.object({
    name: z.string().optional(),
    price: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    isActive: z.string().optional(),
    image: z.instanceof(File).optional(),
  })
);
