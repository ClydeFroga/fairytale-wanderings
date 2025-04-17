import type { Context, Next } from "hono";
import type { FilterQuery } from "mongoose";

export interface FilterOptions {
  searchFields?: string[];
  exactFields?: string[];
}

export const createFilterMiddleware = <T>(options: FilterOptions) => {
  return async (c: Context, next: Next) => {
    const query = c.req.query();
    const filters: FilterQuery<T> = {};

    // Обработка полей для поиска по регулярному выражению
    if (options.searchFields) {
      options.searchFields.forEach((field) => {
        if (query[field]) {
          filters[field as keyof T] = {
            $regex: query[field],
            $options: "i",
          } as any;
        }
      });
    }

    // Обработка полей для точного совпадения
    if (options.exactFields) {
      options.exactFields.forEach((field) => {
        if (query[field]) {
          filters[field as keyof T] = query[field] as any;
        }
      });
    }

    // Сохраняем фильтры в контексте для использования в обработчике
    c.set("filters", filters);

    await next();
  };
};
