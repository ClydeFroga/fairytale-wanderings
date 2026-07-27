import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import type { ICategory, IProduct } from "@global/database/shema";
import { adminHeaders, customerHeaders } from "../../test/e2e/auth";

const app = createApp();

// Мутации закрыты requireAdmin — ходим как владелица магазина.
function post(body: unknown, headers = adminHeaders()) {
  return app.fetch(
    new Request("http://localhost/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

function patch(id: string, body: unknown) {
  return app.fetch(
    new Request(`http://localhost/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...adminHeaders() },
      body: JSON.stringify(body),
    }),
  );
}

function remove(id: string) {
  return app.fetch(
    new Request(`http://localhost/categories/${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    }),
  );
}

async function list(): Promise<ICategory[]> {
  return (await (await app.fetch(new Request("http://localhost/categories"))).json()) as ICategory[];
}

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

describe("Categories E2E", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("GET /categories — возвращает засеянные категории по порядку", async () => {
    const res = await app.fetch(new Request("http://localhost/categories"));
    const data = (await res.json()) as ICategory[];

    expect(res.status).toBe(200);
    expect(data.length).toBe(4);
    expect(data.map((c) => c.slug)).toEqual(["toys", "decor", "accessories", "kitchen"]);
  });

  it("POST /categories — создаёт категорию, slug транслитерируется, позиция в конце", async () => {
    const res = await post({ name: "Вязаные игрушки" });
    const created = (await res.json()) as ICategory;

    expect(res.status).toBe(201);
    expect(created.name).toBe("Вязаные игрушки");
    expect(created.slug).toBe("vyazanye-igrushki");
    expect(created.sortOrder).toBe(5); // после четырёх засеянных

    expect((await list()).map((c) => c.name)).toContain("Вязаные игрушки");
  });

  it("POST /categories — одинаковая транслитерация даёт slug с суффиксом", async () => {
    const first = (await (await post({ name: "Посуда" })).json()) as ICategory;
    const second = (await (await post({ name: "Посуда!" })).json()) as ICategory;

    expect(first.slug).toBe("posuda");
    expect(second.slug).toBe("posuda-2");
  });

  it("POST /categories — дубль названия (без учёта регистра) → 409", async () => {
    const res = await post({ name: "игрушки" });
    const body = (await res.json()) as { code: string };

    expect(res.status).toBe(409);
    expect(body.code).toBe("DUPLICATE_CATEGORY");
    expect((await list()).length).toBe(4);
  });

  it("POST /categories — пустое название → 400", async () => {
    const res = await post({ name: "   " });
    expect(res.status).toBe(400);
  });

  it("PATCH /categories/:id — переименование не меняет slug", async () => {
    const [toys] = await list();

    const res = await patch(toys!.id, { name: "Мягкие игрушки" });
    const updated = (await res.json()) as ICategory;

    expect(res.status).toBe(200);
    expect(updated.name).toBe("Мягкие игрушки");
    expect(updated.slug).toBe("toys");
  });

  it("PATCH /categories/:id — чужое имя → 409, своё же имя разрешено", async () => {
    const categories = await list();
    const toys = categories.find((c) => c.slug === "toys")!;

    expect((await patch(toys.id, { name: "Декор" })).status).toBe(409);
    expect((await patch(toys.id, { name: "Игрушки" })).status).toBe(200);
  });

  it("PATCH /categories/:id — 404 для несуществующей категории", async () => {
    const res = await patch(MISSING_ID, { name: "Что-то" });
    expect(res.status).toBe(404);
  });

  it("DELETE /categories/:id — удаляет категорию, товары остаются без категории", async () => {
    const toys = (await list()).find((c) => c.slug === "toys")!;

    const res = await remove(toys.id);
    expect(res.status).toBe(200);
    expect((await list()).some((c) => c.slug === "toys")).toBe(false);

    const products = (await (
      await app.fetch(new Request("http://localhost/products"))
    ).json()) as (IProduct & { category: string | null })[];

    const teddy = products.find((p) => p.name === "Вязаный мишка Тедди")!;
    expect(teddy.categoryId).toBeNull();
    expect(teddy.category).toBeNull();
    expect(products.length).toBe(5); // товары не удалились вместе с категорией
  });

  it("DELETE /categories/:id — 404 для несуществующей категории", async () => {
    expect((await remove(MISSING_ID)).status).toBe(404);
  });

  it("мутации закрыты: без авторизации → 401, не админ → 403", async () => {
    expect((await post({ name: "Свечи" }, {})).status).toBe(401);
    expect((await post({ name: "Свечи" }, customerHeaders())).status).toBe(403);
    expect((await list()).length).toBe(4);
  });
});
