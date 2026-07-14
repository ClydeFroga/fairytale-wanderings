import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import type { ICategory } from "@global/database/shema";

const app = createApp();

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
});
