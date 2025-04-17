import type { FilterQuery } from "mongoose";
import type { IProduct } from "../global/database/shema/productSchema";
import { createFilterMiddleware } from "../middleware/filterMiddleware";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import type { Context } from "hono";

describe("productFilter", () => {
  it("should filter products by name", async () => {
    const productFilter = createFilterMiddleware<IProduct>({
      searchFields: ["name"],
      exactFields: ["category"],
    });
    let filters: FilterQuery<IProduct> = {};

    const setMock = mock((key: string, value: any) => {
      filters[key] = value;
    });
    const nextMock = mock(() => Promise.resolve());

    const c = {
      req: {
        query: () => ({
          name: "test",
        }),
      },
      set: setMock,
    } as unknown as Context;

    await productFilter(c, nextMock);

    expect(filters).toEqual({
      filters: {
        name: {
          $regex: "test",
          $options: "i",
        },
      },
    });
  });
});
