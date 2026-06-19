import type { INewProduct } from "../../global/database/shema";

// Приводим поля формы к типам колонок БД (price -> number, details -> object и т.д.)
export function mapFormToProduct(
  body: Record<string, unknown>,
  imagePath: string | null
): Partial<INewProduct> {
  const data: Partial<INewProduct> = {};

  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.price === "string") data.price = Number(body.price);
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.category === "string") data.category = body.category;
  if (typeof body.isActive === "string") data.isActive = body.isActive !== "false";

  if (typeof body.details === "string") {
    try {
      data.details = JSON.parse(body.details);
    } catch {
      // некорректный JSON в details игнорируем
    }
  }

  if (imagePath) data.image = [imagePath];

  return data;
}
