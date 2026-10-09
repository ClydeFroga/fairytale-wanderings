import type { INewProduct } from "@global/database/shema";
import type { ProductForm } from "./validator";

/**
 * Необязательное число из формы: поле не пришло — не трогаем колонку, пришло
 * пустым — очищаем (у товара нет своих габаритов), мусор — тоже null.
 * Ноль и отрицательные для веса и габаритов смысла не имеют.
 */
function optionalNumber(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;

  const parsed = Number(value.trim());
  if (!value.trim() || !Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.round(parsed);
}

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

  // Параметры посылки для расчёта доставки (см. productSchema).
  const weight = optionalNumber(form.weight);
  const length = optionalNumber(form.length);
  const width = optionalNumber(form.width);
  const height = optionalNumber(form.height);
  if (weight !== undefined) data.weight = weight;
  if (length !== undefined) data.length = length;
  if (width !== undefined) data.width = width;
  if (height !== undefined) data.height = height;

  if (form.details !== undefined) {
    try {
      data.details = JSON.parse(form.details);
    } catch {
      // некорректный JSON в details игнорируем
    }
  }

  return data;
}
