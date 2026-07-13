import { z } from "zod";

export const emptyToUndefined = (value: string | undefined) =>
  value === undefined || value === "" ? undefined : value;

/** Query-параметр string; пустая строка → undefined. */
export const optionalQueryString = z.string().optional().transform(emptyToUndefined);

/** Query-параметр int ≥ 0; невалидное значение → undefined. */
export const optionalQueryInt = z
  .string()
  .optional()
  .transform((value) => {
    const raw = emptyToUndefined(value);
    if (raw === undefined) return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
  });

/** Query-параметр UUID; невалидное значение → undefined. */
export const optionalQueryUuid = z
  .string()
  .optional()
  .transform((value) => {
    const raw = emptyToUndefined(value);
    if (raw === undefined) return undefined;
    return z.string().uuid().safeParse(raw).success ? raw : undefined;
  });

/** Query-параметр boolean (`true` / `false`); иное → undefined. */
export const optionalQueryBool = z
  .string()
  .optional()
  .transform((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  });
