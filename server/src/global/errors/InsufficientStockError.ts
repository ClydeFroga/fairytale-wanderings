import { AppError } from "./AppError";

export type StockShortage = {
  productId: string;
  available: number;
  requested: number;
};

export class InsufficientStockError extends AppError {
  constructor(public readonly shortages: StockShortage[]) {
    super(
      `Недостаточно товара на складе: ${shortages
        .map((s) => `${s.productId} (в наличии ${s.available}, запрошено ${s.requested})`)
        .join("; ")}`,
      409,
      "INSUFFICIENT_STOCK",
      { shortages }
    );
  }
}
