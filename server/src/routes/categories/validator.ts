import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const name = z.string().trim().min(1, "Название не может быть пустым").max(60);
const sortOrder = z.number().int().min(0).max(9999);

export const createCategoryValidator = zValidator(
  "json",
  z.object({ name, sortOrder: sortOrder.optional() }),
);

// Slug не меняем даже при переименовании: на него завязаны ссылки витрины
// (`/?category=<slug>`), поэтому в форму обновления он не входит.
export const updateCategoryValidator = zValidator(
  "json",
  z.object({ name: name.optional(), sortOrder: sortOrder.optional() }),
);
