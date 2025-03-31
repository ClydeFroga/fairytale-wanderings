import fs from "fs";
import sharp from "sharp";
import path from "path";
import crypto from "crypto";

export class Upload {
  private static uploadDir = path.resolve(
    process.env.UPLOAD_PATH || "",
    "images"
  );

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
   * Обрабатывает загрузку изображения из FormData
   * @param formData - Объект формы с полем image
   * @param defaultValue - Значение по умолчанию если изображение отсутствует
   * @returns Путь к загруженному изображению или defaultValue
   */
  static async processFormImage(
    formData: Record<string, any>,
    defaultValue: string | null = null
  ): Promise<string | null> {
    let imagePath = defaultValue;

    if (formData["image"]) {
      const imageFile = formData["image"];
      if (typeof imageFile === "object" && "arrayBuffer" in imageFile) {
        try {
          imagePath = await Upload.upload(imageFile as File);
        } catch (error) {
          console.error("Ошибка при загрузке изображения:", error);
          throw new Error("Не удалось загрузить изображение");
        }
      } else if (typeof imageFile === "string") {
        // Если уже передан URL к изображению
        imagePath = imageFile;
      }
    }

    return imagePath;
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
