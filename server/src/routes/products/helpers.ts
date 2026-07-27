import type { INewProduct } from "@global/database/shema";
import type { ProductForm } from "./validator";

// Приводим поля формы к типам колонок БД (price -> number, details -> object и т.д.).
// Картинки собираются отдельно (см. resolveKeptImages) — тут их нет.
export function mapFormToProduct(form: ProductForm): Partial<INewProduct> {
  const data: Partial<INewProduct> = {};

  if (form.name !== undefined) data.name = form.name;
  if (form.price !== undefined) data.price = Number(form.price);
  if (form.description !== undefined) data.description = form.description;
  if (form.categoryId !== undefined) data.categoryId = form.categoryId || null;
  if (form.isActive !== undefined) data.isActive = form.isActive !== "false";
  if (form.stock !== undefined) data.stock = Number(form.stock);

  if (form.details !== undefined) {
    try {
      data.details = JSON.parse(form.details);
    } catch {
      // некорректный JSON в details игнорируем
    }
  }

  return data;
}

/**
 * Какие из уже сохранённых картинок остаются у товара.
 * `existingImages` — JSON-массив путей от клиента; берём только те, что реально
 * есть у товара сейчас (иначе клиент мог бы записать в товар произвольный путь).
 * Поле не пришло — значит про картинки речи нет, оставляем все текущие.
 */
export function resolveKeptImages(existingImages: string | undefined, current: string[]): string[] {
  if (existingImages === undefined) return current;

  let parsed: unknown;
  try {
    parsed = JSON.parse(existingImages);
  } catch {
    return current;
  }

  if (!Array.isArray(parsed)) return current;

  return parsed.filter((path): path is string => typeof path === "string" && current.includes(path));
}
