import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  optionalQueryBool,
  optionalQueryString,
  optionalQueryUuid,
} from "@validators/query";

/** Query GET /products: неизвестные ключи отбрасываются, невалидные значения — undefined. */
export const productListQuerySchema = z
  .object({
    _id: optionalQueryUuid,
    name: optionalQueryString,
    category: optionalQueryString, // slug категории
    isActive: optionalQueryBool,
  })
  .strip();

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const listProductsValidator = zValidator("query", productListQuerySchema);

export const createProductValidator = zValidator(
  "form",
  z.object({
    name: z.string(),
    price: z.string(),
    description: z.string(),
    categoryId: z.string(),
    isActive: z.string().optional(),
    stock: z.string().optional(),
    image: z.instanceof(File).optional(),
  }),
);

export const updateProductValidator = zValidator(
  "form",
  z.object({
    name: z.string().optional(),
    price: z.string().optional(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    isActive: z.string().optional(),
    stock: z.string().optional(),
    image: z.instanceof(File).optional(),
  }),
);
