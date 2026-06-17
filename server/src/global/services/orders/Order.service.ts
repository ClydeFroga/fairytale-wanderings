import { Order } from "../../database/shema/orderSchema";

import type { IOrder, IOrderItem } from "../../database/shema/orderSchema";
import { ProductService } from "../products/Product.service";

export class OrderService {
  static async createOrder(
    order: Pick<IOrder, "deliveryAddress"> & {
      items: Pick<IOrderItem, "productId" | "quantity">[];
    }
  ): Promise<IOrder> {
    const products = await ProductService.getProductsById(
      order.items.map((item) => item.productId.toString())
    );

    const totalPrice = products.reduce((acc, product) => {
      const item = order.items.find((i) => i.productId === product._id);
      return acc + (item?.quantity || 0) * (product.price || 0);
    }, 0);

    const orderData = {
      deliveryAddress: order.deliveryAddress,
      totalPrice,
      items: order.items.map((item) => ({
        ...item,
        price: products.find((p) => p._id === item.productId)?.price || 0,
      })),
    } as IOrder;

    return await Order.create(orderData);
  }
}
