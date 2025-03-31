import { Hono } from "hono";
import { ProductService } from "../global/services/products/Product.service";
import {
  createProductValidator,
  updateProductValidator,
} from "../validators/productsValidator";
import type { IProduct } from "../global/database/shema/productSchema";
import { Upload } from "../global/utils/upload";
import { DeleteFile } from "../global/utils/deleteFile";

const app = new Hono();

app.get("/", async (c) => {
  const products = await ProductService.getProducts({ isActive: true });

  return c.json(products);
});

app.post("/", createProductValidator, async (c) => {
  const body = await c.req.parseBody();

  let imagePath: string;

  try {
    imagePath = (await Upload.processFormImage(body, "")) || "";
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }

  const productData = {
    ...Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== "image")
    ),
    ...(imagePath !== "" && { image: imagePath }),
  } as IProduct;

  try {
    const newProduct = await ProductService.createProduct(productData);
    return c.json(newProduct, 201);
  } catch (error) {
    console.error("Ошибка при создании продукта:", error);
    return c.json({ error: "Не удалось создать продукт" }, 500);
  }
});

app.patch("/:id", updateProductValidator, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody();

  let imagePath: string | null;

  try {
    imagePath = await Upload.processFormImage(body, null);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }

  const productData: Partial<IProduct> = {
    ...Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== "image")
    ),
    ...(imagePath !== null && { image: imagePath }),
  };

  const updatedProduct = await ProductService.updateProduct(id, productData);
  return c.json(updatedProduct, 200);
});

app.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const image_path = await ProductService.deleteProduct(id);

  if (image_path) {
    await DeleteFile.deleteFile(image_path);
  }

  return c.json({ message: "Продукт успешно удален" }, 200);
});

export default app;
