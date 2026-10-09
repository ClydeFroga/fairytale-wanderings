import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  optionalQueryBool,
  optionalQueryString,
  optionalQueryUuid,
} from "@validators/query";
import { imagesField } from "@validators/form";

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

export const updateProductFormSchema = z.object({
  name: z.string().optional(),
  price: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.string().optional(),
  stock: z.string().optional(),
  // Параметры посылки: вес в граммах, габариты в см. Пустая строка очищает поле.
  weight: z.string().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  details: z.string().optional(), // JSON-объект характеристик
  image: imagesField, // новые файлы
  // JSON-массив путей уже сохранённых картинок, которые остаются у товара
  // (в нужном порядке). Не передан — оставляем все текущие.
  existingImages: z.string().optional(),
});

export const createProductFormSchema = updateProductFormSchema.extend({
  name: z.string(),
  price: z.string(),
  description: z.string(),
  categoryId: z.string(),
});

/** Поля формы товара после валидации (у создания те же, но заполнены обязательные). */
export type ProductForm = z.infer<typeof updateProductFormSchema>;

export const createProductValidator = zValidator("form", createProductFormSchema);
export const updateProductValidator = zValidator("form", updateProductFormSchema);
