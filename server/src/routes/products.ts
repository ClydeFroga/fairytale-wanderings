import { Hono } from "hono";
import { ProductService } from "../global/services/products/Product.service";
import { createProductValidator } from "../validators/productsValidator";
import type { IProduct } from "../global/database/shema/productSchema";
import { upload } from "../global/utils/upload";

const app = new Hono();

app.get("/", async (c) => {
  const products = await ProductService.getProducts({ isActive: true });

  return c.json(products);
});

app.post("/", createProductValidator, async (c) => {
  const body = await c.req.parseBody();

  let imagePath = "";

  // Проверяем наличие файла и обрабатываем его
  if (body["file"] && body["file"] instanceof File) {
    imagePath = await upload(body["file"]);
  }

  const productData: IProduct = {
    name: String(body.name || ""),
    price: Number(body.price || 0),
    description: String(body.description || ""),
    image: imagePath || String(body.image || ""),
    isActive: body.isActive === "false" ? false : true,
  };

  const newProduct = await ProductService.createProduct(productData);

  return c.json(newProduct);
});

export default app;
