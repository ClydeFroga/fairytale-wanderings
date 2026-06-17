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

  //Получаем продукты по id
  static async getProductsById(ids: string[]): Promise<IProduct[]> {
    return await Product.find({ _id: { $in: ids } });
  }

  //Создаем продукт
  static async createProduct(product: IProduct): Promise<IProduct> {
    return await Product.create(product);
  }

  static async updateProduct(
    id: string,
    product: Partial<IProduct>
  ): Promise<IProduct | null> {
    return await Product.findByIdAndUpdate(id, product, { new: true });
  }

  static async deleteProduct(id: string): Promise<string | null | undefined> {
    const product = await Product.findById(id);
    if (product) {
      await Product.findByIdAndDelete(id);

      return product.image;
    }
  }
}
