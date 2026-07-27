import { describe, it, expect, beforeEach } from "bun:test";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import type { IProduct } from "@global/database/shema";
import { adminHeaders, customerHeaders } from "../../test/e2e/auth";

const app = createApp();

// Минимальная валидная картинка — sharp должен её принять и сконвертировать в webp.
async function pngFile(name: string): Promise<File> {
  const buffer = await sharp({
    create: { width: 4, height: 4, channels: 3, background: "#c08a5a" },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(buffer)], name, { type: "image/png" });
}

function uploadedPath(relative: string): string {
  return path.resolve(process.env.UPLOAD_PATH || "", relative);
}

// Мутации закрыты requireAdmin — по умолчанию ходим как владелица магазина.
async function createProduct(
  files: File[],
  fields: Record<string, string> = {},
  headers = adminHeaders(),
) {
  const form = new FormData();
  form.set("name", "Товар с картинками");
  form.set("price", "1000");
  form.set("description", "описание");
  form.set("categoryId", "");
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  for (const file of files) form.append("image", file);

  return app.fetch(
    new Request("http://localhost/products", { method: "POST", body: form, headers }),
  );
}

async function patchProduct(id: string, body: FormData) {
  return app.fetch(
    new Request(`http://localhost/products/${id}`, {
      method: "PATCH",
      body,
      headers: adminHeaders(),
    }),
  );
}

describe("Products E2E", () => {
  let products: IProduct[];

  beforeEach(async () => {
    products = await resetDatabase();
  });

  it("GET /products — возвращает засеянные товары", async () => {
    const res = await app.fetch(new Request("http://localhost/products"));
    const data = (await res.json()) as IProduct[];

    expect(res.status).toBe(200);
    expect(data).toHaveLength(5);
    expect(data.map((p) => p._id).sort()).toEqual(
      products.map((p) => p._id).sort(),
    );
  });

  it("GET /products/:id — возвращает товар по id", async () => {
    const product = products[0]!;

    const res = await app.fetch(new Request(`http://localhost/products/${product._id}`));
    const data = (await res.json()) as IProduct;

    expect(res.status).toBe(200);
    expect(data._id).toBe(product._id);
    expect(data.name).toBe(product.name);
  });

  it("GET /products — игнорирует некорректные query-фильтры", async () => {
    const res = await app.fetch(
      new Request(
        "http://localhost/products?price=abc&stock=-1&isActive=maybe&_id=not-uuid&foo=bar",
      ),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(5);
  });

  it("GET /products — товар несёт имя и slug категории (join)", async () => {
    const res = await app.fetch(new Request("http://localhost/products"));
    const data = (await res.json()) as (IProduct & { category: string; categorySlug: string })[];

    const teddy = data.find((p) => p.name === "Вязаный мишка Тедди")!;
    expect(teddy.category).toBe("Игрушки");
    expect(teddy.categorySlug).toBe("toys");
  });

  it("GET /products?category=toys — фильтрует по slug категории", async () => {
    const res = await app.fetch(new Request("http://localhost/products?category=toys"));
    const data = (await res.json()) as (IProduct & { categorySlug: string })[];

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2); // мишка Тедди + котик
    expect(data.every((p) => p.categorySlug === "toys")).toBe(true);
  });

  it("GET /products/:id — 404 для несуществующего товара", async () => {
    const res = await app.fetch(
      new Request("http://localhost/products/00000000-0000-4000-8000-000000000000"),
    );

    expect(res.status).toBe(404);
  });

  it("POST /products — принимает несколько картинок и сохраняет их порядок", async () => {
    const res = await createProduct([
      await pngFile("first.png"),
      await pngFile("second.png"),
      await pngFile("third.png"),
    ]);
    const created = (await res.json()) as IProduct;

    expect(res.status).toBe(201);
    expect(created.image).toHaveLength(3);
    expect(created.image[0]).toContain("first");
    expect(created.image[2]).toContain("third");
    expect(created.image.every((p) => fs.existsSync(uploadedPath(p)))).toBe(true);
  });

  it("POST /products — больше пяти картинок отклоняется (400)", async () => {
    const files = await Promise.all(
      Array.from({ length: 6 }, (_, i) => pngFile(`img-${i}.png`)),
    );

    const res = await createProduct(files);
    const body = (await res.json()) as { code: string; details: { max: number } };

    expect(res.status).toBe(400);
    expect(body.code).toBe("TOO_MANY_IMAGES");
    expect(body.details.max).toBe(5);
  });

  it("PATCH /products/:id — оставляет выбранные картинки, дозагружает новые, удаляет файлы", async () => {
    const created = (await (
      await createProduct([await pngFile("keep.png"), await pngFile("drop.png")])
    ).json()) as IProduct;
    const [keep, drop] = created.image as [string, string];

    const form = new FormData();
    form.set("existingImages", JSON.stringify([keep]));
    form.append("image", await pngFile("added.png"));

    const res = await patchProduct(created._id, form);
    const updated = (await res.json()) as IProduct;

    expect(res.status).toBe(200);
    expect(updated.image).toHaveLength(2);
    expect(updated.image[0]).toBe(keep);
    expect(updated.image[1]).toContain("added");
    expect(fs.existsSync(uploadedPath(keep))).toBe(true);
    expect(fs.existsSync(uploadedPath(drop))).toBe(false);
  });

  it("PATCH /products/:id — без полей картинок галерея не меняется", async () => {
    const created = (await (await createProduct([await pngFile("only.png")])).json()) as IProduct;

    const form = new FormData();
    form.set("name", "Новое имя");

    const updated = (await (await patchProduct(created._id, form)).json()) as IProduct;

    expect(updated.name).toBe("Новое имя");
    expect(updated.image).toEqual(created.image);
  });

  it("PATCH /products/:id — чужой путь в existingImages игнорируется", async () => {
    const created = (await (await createProduct([await pngFile("mine.png")])).json()) as IProduct;

    const form = new FormData();
    form.set("existingImages", JSON.stringify([...created.image, "images/../../secret.webp"]));

    const updated = (await (await patchProduct(created._id, form)).json()) as IProduct;

    expect(updated.image).toEqual(created.image);
  });

  it("PATCH /products/:id — превышение лимита с учётом старых картинок (400)", async () => {
    const created = (await (
      await createProduct([await pngFile("a.png"), await pngFile("b.png")])
    ).json()) as IProduct;

    const form = new FormData();
    for (let i = 0; i < 4; i++) form.append("image", await pngFile(`extra-${i}.png`));

    const res = await patchProduct(created._id, form);
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe("TOO_MANY_IMAGES");
    // Товар не тронут, файлы на месте.
    expect((await (await app.fetch(new Request(`http://localhost/products/${created._id}`))).json() as IProduct).image).toEqual(created.image);
  });

  it("DELETE /products/:id — удаляет товар вместе с файлами картинок", async () => {
    const created = (await (
      await createProduct([await pngFile("one.png"), await pngFile("two.png")])
    ).json()) as IProduct;

    const res = await app.fetch(
      new Request(`http://localhost/products/${created._id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      }),
    );

    expect(res.status).toBe(200);
    expect(created.image.some((p) => fs.existsSync(uploadedPath(p)))).toBe(false);
  });

  it("мутации закрыты: без авторизации → 401, не админ → 403", async () => {
    expect((await createProduct([], {}, {})).status).toBe(401);
    expect((await createProduct([], {}, customerHeaders())).status).toBe(403);

    const product = products[0]!;
    const del = await app.fetch(
      new Request(`http://localhost/products/${product._id}`, { method: "DELETE" }),
    );
    expect(del.status).toBe(401);

    // Каталог остался как был: пять засеянных товаров, ничего не создано и не удалено.
    const list = (await (
      await app.fetch(new Request("http://localhost/products"))
    ).json()) as IProduct[];
    expect(list).toHaveLength(5);
  });
});
