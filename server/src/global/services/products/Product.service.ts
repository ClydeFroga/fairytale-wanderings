import { Filter } from "../../utils/Filter";
import { Product } from "./../../database/shema/productSchema";
import type { IProduct } from "./../../database/shema/productSchema";

export class ProductService {
  //Получаем все продукты
  static async getProducts(filters?: Partial<IProduct>): Promise<IProduct[]> {
    const filterObject = Filter.makeFilter<IProduct>(filters);

    return await Product.find(filterObject);
  }

  //Получаем продукт по id
  static async getProductById(id: string): Promise<IProduct | null> {
    return await Product.findById(id);
  }

  //Создаем продукт
  static async createProduct(product: IProduct): Promise<IProduct> {
    return await Product.create(product);
  }
}
