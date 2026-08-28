/**
 * Подменяет названия тарифов в ответе калькулятора: виджет рисует их как есть,
 * а покупателю нужны «Обычная» и «Экспресс», а не «Посылка склад-склад».
 * Имена задаются в CDEK_TARIFF_NAMES; для кодов без имени остаётся исходное.
 * Ответ СДЭК в остальном не трогаем — его разбирает сам виджет.
 */
export function renameTariffs(body: string, names: Map<number, string>): string {
  if (names.size === 0) return body

  try {
    const parsed = JSON.parse(body) as {
      tariff_codes?: Array<{ tariff_code: number; tariff_name: string }>
    }
    if (!Array.isArray(parsed.tariff_codes)) return body

    for (const tariff of parsed.tariff_codes) {
      const name = names.get(tariff.tariff_code)
      if (name) tariff.tariff_name = name
    }

    return JSON.stringify(parsed)
  } catch {
    return body // неожиданный формат — пусть виджет разбирается сам
  }
}
