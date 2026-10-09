import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { imagesField } from "@validators/form";
import { InvalidAboutError } from "@global/errors";

/** Сколько ссылок можно указать в блоке «Продавец». */
export const MAX_LINKS = 5;

// Форма присылается целиком: непришедшее текстовое поле — пустая строка.
const trimmed = (max: number, message: string) => z.string().trim().max(max, message).default("");

const linkSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "У ссылки нет названия")
    .max(40, "Название ссылки — не длиннее 40 символов"),
  // Только http(s): адрес уходит в href на витрине, а `javascript:` там — это XSS.
  url: z
    .string()
    .trim()
    .max(500, "Адрес ссылки слишком длинный")
    .regex(/^https?:\/\/\S+$/i, "Адрес ссылки должен начинаться с http:// или https://"),
});

// links приходит JSON-строкой (multipart не умеет вложенные объекты).
const linksField = z
  .string()
  .default("[]")
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Список ссылок не разобрать" });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(linkSchema, "Список ссылок не разобрать")
      .max(MAX_LINKS, `Ссылок — не больше ${MAX_LINKS}`),
  );

export const updateAboutFormSchema = z.object({
  title: trimmed(120, "Заголовок — не длиннее 120 символов"),
  // Абзацы — через пустую строку, поэтому переводы строк сохраняем, только
  // приводим виндовые \r\n к \n.
  body: z
    .string()
    .default("")
    .transform((value) => value.replace(/\r\n/g, "\n"))
    .pipe(z.string().max(10_000, "Текст — не длиннее 10 000 символов")),
  fullName: trimmed(120, "ФИО — не длиннее 120 символов"),
  // У физлица и самозанятой ИНН 12-значный.
  inn: z
    .string()
    .trim()
    .default("")
    .refine((value) => value === "" || /^\d{12}$/.test(value), "ИНН — 12 цифр"),
  phone: trimmed(30, "Телефон — не длиннее 30 символов"),
  email: z
    .string()
    .trim()
    .default("")
    .refine((value) => value === "" || z.email().safeParse(value).success, "Неверный адрес почты"),
  links: linksField,
  image: imagesField, // новые фото
  // JSON-массив путей уже сохранённых фото, которые остаются (в нужном порядке).
  // Не передан и новых файлов нет — галерея не меняется.
  existingImages: z.string().optional(),
});

export type AboutForm = z.infer<typeof updateAboutFormSchema>;

// Отчёт zod по умолчанию кладёт в `error` объект — баннер CRM показал бы
// «[object Object]». Отдаём первую проблему текстом, как остальные AppError.
export const updateAboutValidator = zValidator("form", updateAboutFormSchema, (result) => {
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new InvalidAboutError(issue?.message ?? "Неверные данные", issue?.path.map(String).join("."));
  }
});
