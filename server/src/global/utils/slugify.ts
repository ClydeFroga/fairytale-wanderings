// Транслитерация кириллицы: slug категории попадает в URL витрины
// (`/?category=<slug>`), поэтому он должен быть латиницей и не меняться со временем.
const RU_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const MAX_SLUG_LENGTH = 60;

/**
 * Название → slug: кириллица транслитерируется, остальное режется до `a-z0-9-`.
 * Пустая строка означает, что из названия ничего не осталось (эмодзи, иероглифы) —
 * вызывающий код подставляет запасной вариант.
 */
export function slugify(value: string): string {
  let out = "";
  for (const char of value.trim().toLowerCase()) {
    out += RU_TO_LAT[char] ?? char;
  }

  return out
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, "");
}

/**
 * Свободный slug: транслит названия, при занятости — суффикс `-2`, `-3`, …
 * `fallback` — если `slugify` вернул пустую строку (одни эмодзи и т.п.).
 */
export function uniqueSlug(name: string, taken: Iterable<string>, fallback: string): string {
  const takenSet = taken instanceof Set ? taken : new Set(taken)
  const base = slugify(name) || fallback
  if (!takenSet.has(base)) return base

  let suffix = 2
  while (takenSet.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}
