import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { InvalidTermsError } from "@global/errors";

// Форма присылается целиком: непришедший текст — пустая строка. Абзацы — через
// пустую строку, поэтому переводы строк и пробелы не трогаем, только \r\n → \n.
const termsText = (label: string) =>
  z
    .string()
    .default("")
    .transform((value) => value.replace(/\r\n/g, "\n"))
    .pipe(z.string().max(10_000, `${label} — не длиннее 10 000 символов`));

// Пустой файл браузер шлёт для незаполненного input — считаем, что файла нет.
// Формат, размер и содержимое проверяет роут (checkDocument): так ответ —
// INVALID_DOCUMENT с понятным текстом, а не отчёт zod.
const documentField = z
  .instanceof(File)
  .optional()
  .transform((file) => (file && file.size > 0 ? file : undefined));

// Флаг удаления документа: всё, кроме "true", — «не удалять».
const flag = z
  .string()
  .optional()
  .transform((value) => value === "true");

export const updateTermsFormSchema = z.object({
  payment: termsText("Текст об оплате"),
  delivery: termsText("Текст о доставке"),
  returns: termsText("Текст о возврате"),
  offer: documentField,
  privacy: documentField,
  removeOffer: flag,
  removePrivacy: flag,
});

export type TermsForm = z.infer<typeof updateTermsFormSchema>;

// Отчёт zod по умолчанию кладёт в `error` объект — баннер CRM показал бы
// «[object Object]». Отдаём первую проблему текстом, как остальные AppError.
export const updateTermsValidator = zValidator("form", updateTermsFormSchema, (result) => {
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new InvalidTermsError(issue?.message ?? "Неверные данные", issue?.path.map(String).join("."));
  }
});
