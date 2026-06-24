import { AppError } from "./AppError";

export class ProductNotFoundError extends AppError {
  constructor(public readonly productId: string) {
    super(`Товар не найден: ${productId}`, 404);
  }
}
