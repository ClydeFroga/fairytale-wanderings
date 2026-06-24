import { AppError } from "./AppError";

export class InsufficientStockError extends AppError {
  constructor(
    public readonly productId: string,
    public readonly available: number,
    public readonly requested: number
  ) {
    super(
      `Недостаточно товара на складе (${productId}): в наличии ${available}, запрошено ${requested}`,
      409
    );
  }
}
