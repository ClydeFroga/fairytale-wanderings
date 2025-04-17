import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import { Hono } from "hono";

// Определяем тип для ProductService
interface IProductService {
  getProducts: (filters?: any) => Promise<any[]>;
  getProductById: (id: string) => Promise<any | null>;
  createProduct: (product: any) => Promise<any>;
  updateProduct: (id: string, product: any) => Promise<any>;
  deleteProduct: (id: string) => Promise<string | null | undefined>;
}

// Определяем тип для Upload
interface IUpload {
  processFormImage: (body: any, defaultValue: any) => Promise<any>;
}

// Определяем тип для DeleteFile
interface IDeleteFile {
  deleteFile: (path: string) => Promise<boolean>;
}

// Для типизации глобальных объектов
declare global {
  var ProductService: IProductService;
  var Upload: IUpload;
  var DeleteFile: IDeleteFile;
}

// Мокируем модули до того, как они будут импортированы
// Мокируем ProductService
const mockGetProducts = mock(() => Promise.resolve([]));
const mockGetProductById = mock(() => Promise.resolve(null));
const mockCreateProduct = mock(() => Promise.resolve({}));
const mockUpdateProduct = mock(() => Promise.resolve(null));
const mockDeleteProduct = mock(() => Promise.resolve(null));

// Мокируем Upload
const mockProcessFormImage = mock(() => Promise.resolve(""));

// Мокируем DeleteFile
const mockDeleteFile = mock(() => Promise.resolve(true));

// Мокируем модули
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
  Upload: {
    processFormImage: mockProcessFormImage,
  },
}));

mock.module("../global/utils/deleteFile", () => ({
  DeleteFile: {
    deleteFile: mockDeleteFile,
  },
}));

// Импортируем модуль с маршрутами после мокирования
import productsApp from "../routes/products";

// Устанавливаем глобальные моки перед импортом маршрутов
global.ProductService = {
  getProducts: mockGetProducts,
  getProductById: mockGetProductById,
  createProduct: mockCreateProduct,
  updateProduct: mockUpdateProduct,
  deleteProduct: mockDeleteProduct,
};
global.Upload = {
  processFormImage: mockProcessFormImage,
};
global.DeleteFile = {
  deleteFile: mockDeleteFile,
};

// Создаем тестовое приложение
const app = new Hono().route("/products", productsApp);

// Тестовые данные
const mockProduct = {
  _id: "65fd123456789abcdef12345",
  name: "Тестовый продукт",
  price: 1000,
  description: "Описание тестового продукта",
  category: "Тестовая категория",
  image: "/uploads/test-image.jpg",
  isActive: true,
};

describe("Products API", () => {
  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
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
      // Устанавливаем мок для возврата списка продуктов
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
