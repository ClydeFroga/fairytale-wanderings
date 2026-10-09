import { z } from "zod";

// Картинки приходят повторяющимся полем `image`: один файл — File, несколько —
// массив (Hono сам собирает одноимённые поля формы). Пустые файлы (браузер шлёт
// их для незаполненного input) отбрасываем. Количество проверяет роут — так
// клиент получает нашу ошибку `TOO_MANY_IMAGES`, а не отчёт zod.
export const imagesField = z
  .union([z.instanceof(File), z.array(z.instanceof(File))])
  .optional()
  .transform((value) => {
    if (!value) return [];
    return (Array.isArray(value) ? value : [value]).filter((file) => file.size > 0);
  });
