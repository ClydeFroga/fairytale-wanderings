import { imageUrl } from '@/scripts/images'

// Галерея в форме: уже сохранённые картинки (path) и только что выбранные файлы
// (file + object URL для превью) в одном списке — порядок в нём и уходит на сервер.
export type ImageSlot = { key: string; url: string; path?: string; file?: File }

let slotSeq = 0

export function savedSlots(paths: string[]): ImageSlot[] {
  return paths.map((path) => ({ key: `saved-${slotSeq++}`, url: imageUrl(path) ?? '', path }))
}

export function fileSlot(file: File): ImageSlot {
  return { key: `new-${slotSeq++}`, url: URL.createObjectURL(file), file }
}

// Object URL живёт, пока слот в списке; освобождаем при удалении и закрытии формы.
export function releaseSlots(slots: ImageSlot[]) {
  for (const slot of slots) {
    if (slot.file) URL.revokeObjectURL(slot.url)
  }
}

export function slotPaths(slots: ImageSlot[]): string[] {
  return slots.flatMap((slot) => (slot.path ? [slot.path] : []))
}

export function slotFiles(slots: ImageSlot[]): File[] {
  return slots.flatMap((slot) => (slot.file ? [slot.file] : []))
}
