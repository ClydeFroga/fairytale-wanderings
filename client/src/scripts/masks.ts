// Маски полей CRM. Принимают то, что сейчас в поле (ввод, вставка, удаление),
// и возвращают отформатированное значение — его же проверяет сервер.

const PHONE_DIGITS = 10 // номер без кода страны: (999) 123-45-67

/** Российский телефон: `+7 (999) 123-45-67`, промежуточные состояния — по мере ввода. */
export function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  const typedPrefix = raw.trim().startsWith('+')

  if (typedPrefix) {
    // «+7 …» — первая цифра это код страны, а не часть номера.
    digits = digits.slice(1)
  } else if (/^[78]/.test(digits) && (digits.length === 1 || digits.length === 11)) {
    // Начали с 8 или 7 в пустом поле либо вставили «8 999 …» / «7999…» целиком.
    digits = digits.slice(1)
    if (!digits) return '+7 ('
  }

  digits = digits.slice(0, PHONE_DIGITS)
  if (!digits) return ''

  let out = `+7 (${digits.slice(0, 3)}`
  if (digits.length > 3) out += `) ${digits.slice(3, 6)}`
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`
  if (digits.length > 8) out += `-${digits.slice(8, 10)}`
  return out
}

export const INN_DIGITS = 12 // ИНН физлица и самозанятой

/** ИНН: только цифры, не больше 12. */
export function formatInn(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, INN_DIGITS)
}
