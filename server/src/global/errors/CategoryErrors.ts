import { AppError } from "./AppError";

export class CategoryNotFoundError extends AppError {
  constructor(public readonly categoryId: string) {
    super(`Категория не найдена: ${categoryId}`, 404, "CATEGORY_NOT_FOUND", { categoryId });
  }
}

/** Категория с таким названием уже есть (сравнение без учёта регистра). */
export class DuplicateCategoryError extends AppError {
  constructor(public readonly name: string) {
    super(`Категория «${name}» уже существует`, 409, "DUPLICATE_CATEGORY", { name });
  }
}
