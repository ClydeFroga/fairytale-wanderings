import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  optionalQueryBool,
  optionalQueryInt,
  optionalQueryString,
  optionalQueryUuid,
} from "@validators/query";

/** Query GET /products: неизвестные ключи отбрасываются, невалидные значения — undefined. */
export const productListQuerySchema = z
  .object({
    _id: optionalQueryUuid,
    name: optionalQueryString,
    price: optionalQueryInt,
    description: optionalQueryString,
    category: optionalQueryString,
    isActive: optionalQueryBool,
    stock: optionalQueryInt,
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
    category: z.string(),
    isActive: z.string().optional(),
    image: z.instanceof(File).optional(),
  }),
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
  }),
);
