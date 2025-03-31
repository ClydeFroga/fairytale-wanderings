import * as mongoose from "mongoose";

const productsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: false },
  isActive: { type: Boolean, default: true },
});

export type IProduct = mongoose.InferSchemaType<typeof productsSchema>;
export const Product = mongoose.model("Product", productsSchema);
