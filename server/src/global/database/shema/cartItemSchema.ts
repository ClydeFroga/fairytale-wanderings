import * as mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  addedAt: { type: Date, default: Date.now },
});

// Создаем составной индекс для предотвращения дубликатов товаров в корзине одного пользователя
cartItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export type ICartItem = mongoose.InferSchemaType<typeof cartItemSchema>;
export const CartItem = mongoose.model("CartItem", cartItemSchema);
