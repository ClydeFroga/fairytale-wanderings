import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  optionalQueryBool,
  optionalQueryString,
  optionalQueryUuid,
} from "@validators/query";

/** Сколько картинок разрешено держать у товара. */
export const MAX_PRODUCT_IMAGES = 5;

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

// Картинки приходят повторяющимся полем `image`: один файл — File, несколько —
// массив (Hono сам собирает одноимённые поля формы). Пустые файлы (браузер шлёт
// их для незаполненного input) отбрасываем. Количество проверяет роут — так
// клиент получает нашу ошибку `TOO_MANY_IMAGES`, а не отчёт zod.
const imagesField = z
  .union([z.instanceof(File), z.array(z.instanceof(File))])
  .optional()
  .transform((value) => {
    if (!value) return [];
    return (Array.isArray(value) ? value : [value]).filter((file) => file.size > 0);
  });

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
