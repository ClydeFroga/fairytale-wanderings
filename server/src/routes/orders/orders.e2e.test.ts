import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { sign } from "@telegram-apps/init-data-node";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import { ProductMethods } from "@global/database/methods/product";
import { UserMethods } from "@global/database/methods/user";
import type { IOrder, IProduct } from "@global/database/shema";
import { TEST_BOT_TOKEN as BOT_TOKEN, adminHeaders, customerHeaders } from "../../test/e2e/auth";
import { buildParcels } from "@global/cdek/parcel";
import { clearCdekEnv, restoreFetch, setCdekEnv, stubCdek } from "../../test/e2e/cdek";
import { clearRobokassaEnv } from "../../test/e2e/robokassa";

process.env.BOT_TOKEN = BOT_TOKEN;

const app = createApp();

describe("Orders E2E", () => {
  let products: IProduct[];

  beforeEach(async () => {
    clearCdekEnv();
    clearRobokassaEnv();
    products = await resetDatabase();
  });

  afterEach(() => {
    restoreFetch();
    clearCdekEnv();
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

  it("POST /orders/create — ПВЗ СДЭК: цена доставки с сервера, входит в сумму", async () => {
    setCdekEnv();
    const calls = stubCdek({ cityCode: 270 });
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          customerName: "Тест",
          contact: "+79990001122",
          deliveryMethod: "cdek_office",
          deliveryAddress: "Новосибирск, ул. Ленина, 1",
          deliveryPointCode: "NSK1",
          deliveryTariffCode: 136,
          deliveryPrice: 350, // Math.round(350.4) — то, что показал виджет
        }),
      }),
    );
    const order = (await res.json()) as IOrder;

    expect(res.status).toBe(201);
    expect(order.deliveryMethod).toBe("cdek_office");
    expect(order.deliveryPointCode).toBe("NSK1");
    expect(order.deliveryTariffCode).toBe(136);
    expect(order.deliveryPrice).toBe(350);
    expect(order.totalPrice).toBe(product.price + 350);

    // Сервер сам спросил калькулятор: отправитель — код города из .env,
    // получатель — город ПВЗ, посылка — из веса и габаритов товара в БД.
    const calc = calls.find((c) => c.url.includes("/calculator/tarifflist"))!;
    const payload = JSON.parse(String(calc.init?.body));
    expect(payload.from_location).toEqual({ code: 44 });
    expect(payload.to_location).toEqual({ code: 270 });
    expect(payload.packages).toEqual(
      buildParcels([{ ...product, quantity: 1 }], { length: 20, width: 15, height: 10, weight: 500 }),
    );
  });

  it("POST /orders/create — курьер СДЭК: получатель по адресу из виджета", async () => {
    setCdekEnv();
    const calls = stubCdek();
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          contact: "+79990001122",
          deliveryMethod: "cdek_door",
          deliveryAddress: "Москва, ул. Тверская, 1, кв. 5",
          deliveryLocation: { address: "Москва, ул. Тверская, 1", postal_code: "125009", country_code: "RU" },
          deliveryTariffCode: 137,
          deliveryPrice: 520,
        }),
      }),
    );
    const order = (await res.json()) as IOrder;

    expect(res.status).toBe(201);
    expect(order.totalPrice).toBe(product.price + 520);
    const calc = calls.find((c) => c.url.includes("/calculator/tarifflist"))!;
    expect(JSON.parse(String(calc.init?.body)).to_location).toEqual({
      address: "Москва, ул. Тверская, 1",
      postal_code: "125009",
      country_code: "RU",
    });
  });

  it("POST /orders/create — 400, если курьеру не передан адрес из виджета", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          deliveryMethod: "cdek_door",
          deliveryAddress: "Москва, ул. Тверская, 1, кв. 5",
          deliveryTariffCode: 137,
          deliveryPrice: 520,
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("POST /orders/create — 409 DELIVERY_PRICE_CHANGED, заказ не создаётся", async () => {
    setCdekEnv();
    stubCdek();
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          deliveryMethod: "cdek_office",
          deliveryAddress: "Новосибирск, ул. Ленина, 1",
          deliveryPointCode: "NSK1",
          deliveryTariffCode: 136,
          deliveryPrice: 100, // подделано в браузере
        }),
      }),
    );
    const body = (await res.json()) as { code: string; details: { price: number } };

    expect(res.status).toBe(409);
    expect(body.code).toBe("DELIVERY_PRICE_CHANGED");
    expect(body.details.price).toBe(350);
    const updated = await ProductMethods.getById(product._id);
    expect(updated?.stock).toBe(product.stock);
  });

  it("POST /orders/create — тариф не из разрешённого списка → 400", async () => {
    setCdekEnv({ CDEK_TARIFFS_OFFICE: "136" });
    stubCdek();
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          deliveryMethod: "cdek_office",
          deliveryAddress: "Новосибирск, ул. Ленина, 1",
          deliveryPointCode: "NSK1",
          deliveryTariffCode: 483,
          deliveryPrice: 600,
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("CDEK_INVALID_TARIFF");
  });

  it("POST /orders/create — неизвестный ПВЗ → 400", async () => {
    setCdekEnv();
    stubCdek();
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          deliveryMethod: "cdek_office",
          deliveryAddress: "Где-то",
          deliveryPointCode: "MISSING1",
          deliveryTariffCode: 136,
          deliveryPrice: 350,
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("CDEK_POINT_NOT_FOUND");
  });

  it("POST /orders/create — СДЭК недоступен → 502, остаток не списан", async () => {
    setCdekEnv();
    stubCdek({ calculatorStatus: 500 });
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          deliveryMethod: "cdek_office",
          deliveryAddress: "Новосибирск, ул. Ленина, 1",
          deliveryPointCode: "NSK2",
          deliveryTariffCode: 136,
          deliveryPrice: 350,
        }),
      }),
    );

    expect(res.status).toBe(502);
    const updated = await ProductMethods.getById(product._id);
    expect(updated?.stock).toBe(product.stock);
  });

  it("POST /orders/create — СДЭК не настроен, а пришёл заказ в ПВЗ → 503", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          deliveryMethod: "cdek_office",
          deliveryAddress: "Новосибирск, ул. Ленина, 1",
          deliveryPointCode: "NSK1",
          deliveryTariffCode: 136,
          deliveryPrice: 350,
        }),
      }),
    );

    expect(res.status).toBe(503);
  });

  it("POST /orders/create — ручной адрес: доставка не считается и в сумму не входит", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          deliveryMethod: "manual",
          deliveryAddress: "ул. Тестовая, 1",
          deliveryPrice: 999, // для ручного адреса игнорируется
        }),
      }),
    );
    const order = (await res.json()) as IOrder;

    expect(res.status).toBe(201);
    expect(order.deliveryPrice).toBeNull();
    expect(order.totalPrice).toBe(product.price);
  });

  it("POST /orders/create — 400, если для ПВЗ не передан код точки", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;

    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          deliveryMethod: "cdek_office",
          deliveryAddress: "Новосибирск, ул. Ленина, 1",
        }),
      }),
    );

    expect(res.status).toBe(400);
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

  // --- CRM: список и статусный флоу ---

  async function makeOrder(quantity = 1, extra: Record<string, unknown> = {}): Promise<IOrder> {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;
    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity }],
          customerName: "Тест",
          contact: "+79990001122",
          ...extra,
        }),
      }),
    );
    return (await res.json()) as IOrder;
  }

  function setStatus(id: string, status: string, headers = adminHeaders()) {
    return app.fetch(
      new Request(`http://localhost/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status }),
      }),
    );
  }

  function getOrders(headers = adminHeaders()) {
    return app.fetch(new Request("http://localhost/orders", { headers }));
  }

  it("POST /orders/create — новый заказ получает статус created", async () => {
    const order = await makeOrder();
    expect(order.status).toBe("created");
  });

  it("POST /orders/create — заказы получают сквозной номер (InvId Робокассы)", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;
    const create = () =>
      app.fetch(
        new Request("http://localhost/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ productId: product._id, quantity: 1 }],
            customerName: "Тест",
            contact: "+79990001122",
            deliveryAddress: "ул. Тестовая, 1",
          }),
        }),
      );

    const first = (await (await create()).json()) as IOrder;
    const second = (await (await create()).json()) as IOrder;

    // resetDatabase делает RESTART IDENTITY — нумерация в каждом тесте с 1.
    expect(first.number).toBe(1);
    expect(second.number).toBe(2);
    expect(first.paidAt).toBeNull();
    expect(first.paymentExpiresAt).toBeNull();
  });

  it("POST /orders/create — почта необязательна, но сохраняется и нормализуется", async () => {
    const withoutEmail = await makeOrder();
    expect(withoutEmail.email).toBeNull();

    const withEmail = await makeOrder(1, { email: "  Anya@Example.COM " });
    expect(withEmail.email).toBe("anya@example.com");
  });

  it("POST /orders/create — кривая почта отклоняется (400), заказ не создаётся", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;
    const res = await app.fetch(
      new Request("http://localhost/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: 1 }],
          email: "не-почта",
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect((await ProductMethods.getById(product._id))?.stock).toBe(product.stock);
  });

  it("GET /orders — отдаёт заказы с составом, новые сверху", async () => {
    const product = products.find((p) => p.name === "Вязаный мишка Тедди")!;
    const first = await makeOrder(1);
    const second = await makeOrder(2);

    const res = await getOrders();
    const list = (await res.json()) as (IOrder & {
      items: { productId: string | null; name: string; quantity: number; price: number }[];
    })[];

    expect(res.status).toBe(200);
    expect(list).toHaveLength(2);
    expect(list.map((o) => o.id)).toEqual([second.id, first.id]);
    expect(list[0]!.items).toEqual([
      { productId: product._id, name: product.name, quantity: 2, price: product.price },
    ]);
    // Плоские telegram*-поля из join наружу не отдаём — только собранный объект.
    expect(list[0]).not.toHaveProperty("telegramId");
    expect(list[0]).toHaveProperty("telegram", null); // веб-заказ — телеграма нет
  });

  it("GET /orders — у телеграм-заказа виден контакт покупателя", async () => {
    const initData = sign(
      { user: { id: 555010, first_name: "Аня", last_name: "П", username: "anya" } } as never,
      BOT_TOKEN,
      new Date(),
    );
    await makeOrder(1, { initData });

    const list = (await (await getOrders()).json()) as { telegram: unknown }[];

    expect(list[0]!.telegram).toEqual({ id: 555010, username: "anya", name: "Аня П" });
  });

  it("GET /orders — закрыт от посторонних (401 / 403)", async () => {
    expect((await getOrders({})).status).toBe(401);
    expect((await getOrders(customerHeaders())).status).toBe(403);
  });

  it("PATCH /orders/:id/status — ведёт заказ по цепочке и отвечает как список (с составом)", async () => {
    const order = await makeOrder(2);

    for (const status of ["paid", "assembled", "shipped", "completed"] as const) {
      const res = await setStatus(order.id, status);
      const updated = (await res.json()) as IOrder & { items: { quantity: number }[] };

      expect(res.status).toBe(200);
      expect(updated.status).toBe(status);
      // Клиент подменяет строку списка этим ответом — форма должна совпадать.
      expect(updated.items).toEqual([expect.objectContaining({ quantity: 2 })]);
      expect(updated).toHaveProperty("telegram", null);
      expect(updated).not.toHaveProperty("telegramId");
    }
  });

  it("PATCH /orders/:id/status — назад и из завершённого нельзя (409)", async () => {
    const order = await makeOrder();
    await setStatus(order.id, "paid");

    const back = await setStatus(order.id, "created");
    const body = (await back.json()) as { code: string; details: { from: string; to: string } };
    expect(back.status).toBe(409);
    expect(body.code).toBe("INVALID_STATUS_TRANSITION");
    expect(body.details).toEqual({ from: "paid", to: "created" });

    await setStatus(order.id, "completed");
    expect((await setStatus(order.id, "cancelled")).status).toBe(409);
  });

  it("PATCH /orders/:id/status — отмена возможна с середины цепочки", async () => {
    const order = await makeOrder();
    await setStatus(order.id, "paid");

    const res = await setStatus(order.id, "cancelled");
    expect(res.status).toBe(200);
    expect(((await res.json()) as IOrder).status).toBe("cancelled");

    // из отменённого — уже никуда
    expect((await setStatus(order.id, "assembled")).status).toBe(409);
  });

  it("PATCH /orders/:id/status — неизвестный статус (400) и неизвестный заказ (404)", async () => {
    const order = await makeOrder();

    expect((await setStatus(order.id, "delivered")).status).toBe(400);
    expect(
      (await setStatus("00000000-0000-4000-8000-000000000000", "paid")).status,
    ).toBe(404);
  });

  it("PATCH /orders/:id/status — закрыт от посторонних (401 / 403)", async () => {
    const order = await makeOrder();

    expect((await setStatus(order.id, "paid", {})).status).toBe(401);
    expect((await setStatus(order.id, "paid", customerHeaders())).status).toBe(403);

    const [fresh] = (await (await getOrders()).json()) as IOrder[];
    expect(fresh!.status).toBe("created");
  });
});
