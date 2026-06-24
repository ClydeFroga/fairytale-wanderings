import { describe, it, expect, beforeEach, mock } from "bun:test";
import { Hono } from "hono";

const mockGetActive = mock(() => Promise.resolve([] as any[]));
const mockGetById = mock(() => Promise.resolve(null));
const mockCreate = mock(() => Promise.resolve({}));
const mockUpdate = mock(() => Promise.resolve(null));
const mockRemove = mock(() => Promise.resolve(null));
const mockProcessFormImage = mock(() => Promise.resolve(""));
const mockDeleteFile = mock(() => Promise.resolve(true));

mock.module("../global/database/methods/product", () => ({
  ProductMethods: {
    getActive: mockGetActive,
    getById: mockGetById,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
  },
}));

mock.module("../global/utils/upload", () => ({
  Upload: { processFormImage: mockProcessFormImage },
}));

mock.module("../global/utils/deleteFile", () => ({
  DeleteFile: { deleteFile: mockDeleteFile },
}));

import productsApp from "../routes/products/route";

const app = new Hono().route("/products", productsApp);

const mockProduct = {
  _id: "65fd123456789abcdef12345",
  name: "Тестовый продукт",
  price: 1000,
  description: "Описание тестового продукта",
  category: "Тестовая категория",
  image: ["/uploads/test-image.jpg"],
  isActive: true,
  stock: 7,
};

describe("Products API", () => {
  beforeEach(() => {
    mockGetActive.mockClear();
    mockGetById.mockClear();
    mockCreate.mockClear();
    mockUpdate.mockClear();
    mockRemove.mockClear();
  });

  describe("GET /products", () => {
    it("должен возвращать список продуктов", async () => {
      mockGetActive.mockReturnValueOnce(Promise.resolve([mockProduct]));

      const res = await app.fetch(new Request("http://localhost/products"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual([mockProduct]);
    });

    it("должен корректно обрабатывать пустой список продуктов", async () => {
      mockGetActive.mockReturnValueOnce(Promise.resolve([]));

      const res = await app.fetch(new Request("http://localhost/products"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual([]);
    });
  });
});
