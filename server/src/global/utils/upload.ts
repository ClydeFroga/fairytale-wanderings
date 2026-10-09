import fs from "fs";
import sharp from "sharp";
import path from "path";
import crypto from "crypto";
import { InvalidImageError } from "@global/errors";

/** Сколько картинок разрешено держать у товара и на странице «Обо мне». */
export const MAX_IMAGES = 5;

/**
 * Какие из уже сохранённых картинок остаются.
 * `existingImages` — JSON-массив путей от клиента; берём только те, что реально
 * есть сейчас (иначе клиент мог бы записать произвольный путь).
 * Поле не пришло — значит про картинки речи нет, оставляем все текущие.
 */
export function resolveKeptImages(existingImages: string | undefined, current: string[]): string[] {
  if (existingImages === undefined) return current;

  let parsed: unknown;
  try {
    parsed = JSON.parse(existingImages);
  } catch {
    return current;
  }

  if (!Array.isArray(parsed)) return current;

  return parsed.filter((path): path is string => typeof path === "string" && current.includes(path));
}

export class Upload {
  /** Корень каталога загрузок: в БД пути относительные (`images/x.webp`). */
  static readonly rootDir = path.resolve(process.env.UPLOAD_PATH || "");

  private static uploadDir = path.join(Upload.rootDir, "images");

  static async upload(file: File) {
    // Генерируем имя файла с метками времени и случайным хешем
    const originalName = file.name;
    const fileNameWithoutExt = path.parse(originalName).name;
    const timestamp = Date.now();
    // Добавляем случайный хеш к имени файла для уникальности
    const randomHash = crypto.randomBytes(4).toString("hex");
    const newFileName = `${timestamp}-${randomHash}-${fileNameWithoutExt}.webp`;
    const filePath = path.join(this.uploadDir, newFileName);

    // Создаем директорию, если она не существует
    await this.createDir(this.uploadDir);

    // Получаем ArrayBuffer из File
    const arrayBuffer = await file.arrayBuffer();
    // Создаем буфер из ArrayBuffer
    const buffer = Buffer.from(arrayBuffer);

    // Конвертируем изображение в WebP с оптимизацией
    await this.convertToWebp(buffer, filePath);

    // Возвращаем путь к файлу относительно корня сайта
    // Используем правильный относительный путь, соответствующий директории загрузки
    return path.join("images", newFileName).replace(/\\/g, "/");
  }

  /**
   * Сохраняет пачку файлов из формы (порядок сохраняется).
   * Если хоть один файл не обработался — уже загруженные удаляем, чтобы не
   * копить мусор на диске, и бросаем `InvalidImageError` (400).
   */
  static async saveImages(files: File[]): Promise<string[]> {
    const paths: string[] = [];

    for (const file of files) {
      try {
        paths.push(await Upload.upload(file));
      } catch (error) {
        console.error("Ошибка при загрузке изображения:", error);
        await Upload.removeMany(paths);
        throw new InvalidImageError(file.name);
      }
    }

    return paths;
  }

  /** Удаляет ранее сохранённые файлы (пути — как их вернул `upload`). */
  static async removeMany(paths: string[]) {
    const uploadRoot = Upload.rootDir;

    for (const relative of paths) {
      // Абсолютные URL (сид на picsum) файлами не являются — пропускаем.
      if (/^https?:\/\//.test(relative)) continue;

      const fullPath = path.resolve(uploadRoot, relative);
      // Не выходим за пределы каталога загрузок, даже если путь пришёл извне.
      if (!fullPath.startsWith(uploadRoot)) continue;

      await fs.promises.rm(fullPath, { force: true });
    }
  }

  private static async createDir(fullUploadPath: string) {
    if (!fs.existsSync(fullUploadPath)) {
      fs.mkdirSync(fullUploadPath, { recursive: true });
    }
  }

  // Конвертируем изображение в WebP с оптимизацией
  private static async convertToWebp(buffer: Buffer, filePath: string) {
    await sharp(buffer)
      .webp({ quality: 80 }) // Настраиваем качество (0-100)
      .resize(1200, null, {
        // Максимальная ширина 1200px, высота автоматически
        withoutEnlargement: true, // Не увеличивать изображения меньшего размера
        fit: "inside",
      })
      .toFile(filePath);
  }
}
