import { describe, it, expect, beforeEach } from "bun:test";
import { sign } from "@telegram-apps/init-data-node";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import { ProductMethods } from "@global/database/methods/product";
import { UserMethods } from "@global/database/methods/user";
import type { IOrder, IProduct } from "@global/database/shema";

const BOT_TOKEN = "123456:TEST_BOT_TOKEN";
process.env.BOT_TOKEN = BOT_TOKEN;

const app = createApp();

describe("Orders E2E", () => {
  let products: IProduct[];

  beforeEach(async () => {
    products = await resetDatabase();
  });

  it("POST /orders/create — создаёт заказ и списывает остаток", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 2 }],
          customerName: "Тест",
          contact: "+79990001122",
          deliveryAddress: "ул. Тестовая, 1",
        }),
      }),
    );
    const order = (await res.json()) as IOrder;

    expect(res.status).toBe(201);
    expect(order.totalPrice).toBe(product.price * 2);
    expect(order.customerName).toBe("Тест");

    const updated = await ProductMethods.getById(product._id);
    expect(updated?.stock).toBe(product.stock - 2);
  });

  it("POST /orders/create — 404 для несуществующего товара", async () => {
    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "00000000-0000-4000-8000-000000000000", quantity: 1 }],
        }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it("POST /orders/create — 409 при нехватке остатка", async () => {
    const product = products.find((p) => p.name === "Плед «Облако»")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: product.stock + 1 }],
        }),
      }),
    );

    expect(res.status).toBe(409);

    const unchanged = await ProductMethods.getById(product._id);
    expect(unchanged?.stock).toBe(product.stock);
  });

  it("POST /orders/create — откатывает транзакцию, если не хватает остатка у второй позиции", async () => {
    const teddy = products.find((p) => p.name === "Вязаный мишка Тедди")!;
    const blanket = products.find((p) => p.name === "Плед «Облако»")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { productId: teddy._id, quantity: 2 },
            { productId: blanket._id, quantity: blanket.stock + 1 },
          ],
        }),
      }),
    );

    expect(res.status).toBe(409);
    // Списание по первой позиции тоже откатывается вместе с транзакцией.
    expect((await ProductMethods.getById(teddy._id))?.stock).toBe(teddy.stock);
    expect((await ProductMethods.getById(blanket._id))?.stock).toBe(blanket.stock);
  });

  it("POST /orders/create — при гонке за последний остаток проходит только один заказ", async () => {
    const product = products.find((p) => p.name === "Шапка-бини")!;
    await ProductMethods.update(product._id, { stock: 1 });

    const body = JSON.stringify({
      items: [{ productId: product._id, quantity: 1 }],
      customerName: "Гонка",
    });

    const createOrder = () =>
      app.fetch(
        new Request("http://localhost/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }),
      );

    const [resA, resB] = await Promise.all([createOrder(), createOrder()]);
    const statuses = [resA.status, resB.status].sort();

    expect(statuses).toEqual([201, 409]);

    const updated = await ProductMethods.getById(product._id);
    expect(updated?.stock).toBe(0);
  });

  it("POST /orders/create — заказ из Telegram: channel=telegram и создаётся пользователь", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;
    const initData = sign(
      { user: { id: 555001, first_name: "Аня", username: "anya" } } as never,
      BOT_TOKEN,
      new Date(),
    );

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          customerName: "Аня",
          initData,
        }),
      }),
    );
    const order = (await res.json()) as IOrder;

    expect(res.status).toBe(201);
    expect(order.channel).toBe("telegram");
    expect(order.userId).toBeTruthy();

    const user = await UserMethods.getByTelegramId(555001);
    expect(user?.id).toBe(order.userId!);
    expect(user?.firstName).toBe("Аня");
  });

  it("POST /orders/create — заказ из Telegram сохраняет телефон в профиль", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;
    const initData = sign(
      { user: { id: 555003, first_name: "Оля" } } as never,
      BOT_TOKEN,
      new Date(),
    );

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          customerName: "Оля",
          contact: "+7 (999) 555-33-11",
          initData,
        }),
      }),
    );

    expect(res.status).toBe(201);

    const user = await UserMethods.getByTelegramId(555003);
    expect(user?.phone).toBe("+7 (999) 555-33-11");
  });

  it("POST /orders/create — поддельная initData отклоняется (401)", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;
    const initData = sign({ user: { id: 555002, first_name: "Fake" } } as never, "999:WRONG", new Date());

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          initData,
        }),
      }),
    );

    expect(res.status).toBe(401);
    // остаток не тронут
    expect((await ProductMethods.getById(product._id))?.stock).toBe(product.stock);
  });
});
