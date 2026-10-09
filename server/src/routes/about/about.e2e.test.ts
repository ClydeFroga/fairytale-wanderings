import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../../app";
import { resetDatabase } from "../../test/e2e/db";
import type { AboutResponse } from "./helpers";

const app = createApp();

async function getAbout(): Promise<{ status: number; body: AboutResponse }> {
  const res = await app.fetch(new Request("http://localhost/about"));
  return { status: res.status, body: (await res.json()) as AboutResponse };
}

describe("About E2E", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("GET /about до первого сохранения — пустые значения", async () => {
    const { status, body } = await getAbout();

    expect(status).toBe(200);
    expect(body).toEqual({
      about: { title: "", body: "", images: [] },
      seller: { fullName: "", inn: "", phone: "", email: "", links: [] },
    });
  });
});
