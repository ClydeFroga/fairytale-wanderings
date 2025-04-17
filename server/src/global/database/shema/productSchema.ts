import * as mongoose from "mongoose";

const productsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: Array, required: false },
  isActive: { type: Boolean, default: true },
  details: { type: Object, required: false },
});

export type IProduct = mongoose.InferSchemaType<typeof productsSchema>;
export const Product = mongoose.model("Product", productsSchema);
