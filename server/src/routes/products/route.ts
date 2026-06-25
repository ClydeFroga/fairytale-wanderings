import { Hono } from "hono";
import { ProductMethods } from "@global/database/methods/product";
import { createProductValidator, updateProductValidator } from "./validator";
import { mapFormToProduct } from "./helpers";
import type { INewProduct } from "@global/database/shema";
import { Upload } from "@global/utils/upload";
import { DeleteFile } from "@global/utils/deleteFile";

const app = new Hono();

app.get("/", async (c) => {
  const { name, category } = c.req.query();

  const products = await ProductMethods.getActive({ name, category });

  return c.json(products);
});

app.get("/:id", async (c) => {
  const { id } = c.req.param();
  const product = await ProductMethods.getById(id);

  if (!product) {
    return c.json({ error: "Продукт не найден" }, 404);
  }

  return c.json(product);
});

app.post("/", createProductValidator, async (c) => {
  const body = await c.req.parseBody();

  let imagePath: string | null;

  try {
    imagePath = await Upload.processFormImage(body, null);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }

  const productData = mapFormToProduct(body, imagePath) as INewProduct;

  try {
    const newProduct = await ProductMethods.create(productData);
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

  const productData = mapFormToProduct(body, imagePath);

  const updatedProduct = await ProductMethods.update(id, productData);
  return c.json(updatedProduct, 200);
});

app.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const images = await ProductMethods.remove(id);

  if (images) {
    for (const image of images) {
      await DeleteFile.deleteFile(image);
    }
  }

  return c.json({ message: "Продукт успешно удален" }, 200);
});

export default app;
