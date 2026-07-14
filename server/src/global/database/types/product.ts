import type { IProduct } from "../shema";

/** Товар с присоединённой категорией (имя + slug) — то, что отдаём клиенту. */
export type ProductView = IProduct & {
  category: string | null;
  categorySlug: string | null;
};

/** Поддерживаемые фильтры списка товаров. `category` — это slug категории. */
export type ProductListFilters = {
  _id?: string;
  name?: string;
  category?: string;
  isActive?: boolean;
};
