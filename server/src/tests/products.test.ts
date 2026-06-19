import {
  describe,
  it,
  expect,
  beforeEach,
  mock,
} from "bun:test";
import { Hono } from "hono";

interface IProductService {
  getProducts: (filters?: any) => Promise<any[]>;
  getProductById: (id: string) => Promise<any | null>;
  createProduct: (product: any) => Promise<any>;
  updateProduct: (id: string, product: any) => Promise<any>;
  deleteProduct: (id: string) => Promise<string[] | null | undefined>;
}

interface IUpload {
  processFormImage: (body: any, defaultValue: any) => Promise<any>;
}

interface IDeleteFile {
  deleteFile: (path: string) => Promise<boolean>;
}

declare global {
  var ProductService: IProductService;
  var Upload: IUpload;
  var DeleteFile: IDeleteFile;
}

const mockGetProducts = mock(() => Promise.resolve([] as any[]));
const mockGetProductById = mock(() => Promise.resolve(null));
const mockCreateProduct = mock(() => Promise.resolve({}));
const mockUpdateProduct = mock(() => Promise.resolve(null));
const mockDeleteProduct = mock(() => Promise.resolve(null));
const mockProcessFormImage = mock(() => Promise.resolve(""));
const mockDeleteFile = mock(() => Promise.resolve(true));

mock.module("../global/services/products/Product.service", () => ({
  ProductService: {
    getProducts: mockGetProducts,
    getProductById: mockGetProductById,
    createProduct: mockCreateProduct,
    updateProduct: mockUpdateProduct,
    deleteProduct: mockDeleteProduct,
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
};

describe("Products API", () => {
  beforeEach(() => {
    mockGetProducts.mockClear();
    mockGetProductById.mockClear();
    mockCreateProduct.mockClear();
    mockUpdateProduct.mockClear();
    mockDeleteProduct.mockClear();
    mockProcessFormImage.mockClear();
    mockDeleteFile.mockClear();
  });

  describe("GET /products", () => {
    it("должен возвращать список продуктов", async () => {
      mockGetProducts.mockReturnValueOnce(Promise.resolve([mockProduct]));

      const req = new Request("http://localhost/products");
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual([mockProduct]);
    });

    it("должен корректно обрабатывать пустой список продуктов", async () => {
      mockGetProducts.mockReturnValueOnce(Promise.resolve([]));

      const req = new Request("http://localhost/products");
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual([]);
    });
  });
});
