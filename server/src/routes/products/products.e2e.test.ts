import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import type { IProduct } from "@global/database/shema";

const app = createApp();

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
});
