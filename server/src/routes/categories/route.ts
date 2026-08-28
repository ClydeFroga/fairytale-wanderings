import { Hono } from "hono";
import { CategoryMethods } from "@global/database/methods/category";
import type { ICategory } from "@global/database/shema";
import { CategoryNotFoundError, DuplicateCategoryError } from "@global/errors";
import { uniqueSlug } from "@global/utils/slugify";
import { createCategoryValidator, updateCategoryValidator } from "./validator";
import { requireAdmin } from "../../middleware/requireAdmin";

const app = new Hono();

// Список категорий нужен витрине, поэтому открыт; правки — только для владелицы.
app.get("/", async (c) => {
  const categories = await CategoryMethods.getList();
  return c.json(categories);
});

app.post("/", requireAdmin, createCategoryValidator, async (c) => {
  const { name, sortOrder } = c.req.valid("json");

  // Категорий десятки — берём список целиком и считаем по нему и дубли, и slug,
  // и позицию, вместо трёх отдельных запросов.
  const existing = await CategoryMethods.getList();
  assertNameFree(existing, name);

  const created = await CategoryMethods.create({
    name,
    slug: freeSlug(existing, name),
    sortOrder: sortOrder ?? nextSortOrder(existing),
  });

  return c.json(created, 201);
});

app.patch("/:id", requireAdmin, updateCategoryValidator, async (c) => {
  const { id } = c.req.param();
  const { name, sortOrder } = c.req.valid("json");

  const existing = await CategoryMethods.getList();
  const current = existing.find((category) => category.id === id);
  if (!current) throw new CategoryNotFoundError(id);

  if (name !== undefined) assertNameFree(existing, name, id);

  const data: Partial<ICategory> = {};
  if (name !== undefined) data.name = name;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (Object.keys(data).length === 0) return c.json(current, 200);

  // Переименование не трогает slug — иначе сохранённые ссылки на категорию сломаются.
  const updated = await CategoryMethods.update(id, data);

  return c.json(updated, 200);
});

app.delete("/:id", requireAdmin, async (c) => {
  const { id } = c.req.param();

  const removed = await CategoryMethods.remove(id);
  if (!removed) throw new CategoryNotFoundError(id);

  // Товары удалённой категории остаются в каталоге как «без категории»
  // (FK products.category_id → ON DELETE SET NULL).
  return c.json({ message: "Категория удалена" }, 200);
});

function assertNameFree(existing: ICategory[], name: string, exceptId?: string) {
  const taken = existing.some(
    (category) =>
      category.id !== exceptId && category.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw new DuplicateCategoryError(name);
}

function freeSlug(existing: ICategory[], name: string): string {
  return uniqueSlug(
    name,
    existing.map((category) => category.slug),
    'category',
  )
}

function nextSortOrder(existing: ICategory[]): number {
  return existing.reduce((max, category) => Math.max(max, category.sortOrder), 0) + 1;
}

export default app;
