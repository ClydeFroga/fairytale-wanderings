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
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(5);
    expect(data.map((p: IProduct) => p._id).sort()).toEqual(
      products.map((p) => p._id).sort(),
    );
  });

  it("GET /products/:id — возвращает товар по id", async () => {
    const product = products[0]!;

    const res = await app.fetch(new Request(`http://localhost/products/${product._id}`));
    const data = await res.json();

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

  it("GET /products/:id — 404 для несуществующего товара", async () => {
    const res = await app.fetch(
      new Request("http://localhost/products/00000000-0000-4000-8000-000000000000"),
    );

    expect(res.status).toBe(404);
  });
});
