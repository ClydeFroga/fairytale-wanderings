import fs from "fs";
import sharp from "sharp";
import path from "path";

export const upload = async (file: File) => {
  // Генерируем имя файла с метками времени
  const originalName = file.name;
  const fileNameWithoutExt = path.parse(originalName).name;
  const newFileName = `${Date.now()}-${fileNameWithoutExt}.webp`;
  const uploadDir = process.env.UPLOAD_PATH || "./uploads";
  const filePath = path.join(uploadDir, newFileName);

  // Создаем директорию, если она не существует
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Получаем ArrayBuffer из File
  const arrayBuffer = await file.arrayBuffer();
  // Создаем буфер из ArrayBuffer
  const buffer = Buffer.from(arrayBuffer);

  // Конвертируем изображение в WebP с оптимизацией
  await sharp(buffer)
    .webp({ quality: 80 }) // Настраиваем качество (0-100)
    .resize(1200, null, {
      // Максимальная ширина 1200px, высота автоматически
      withoutEnlargement: true, // Не увеличивать изображения меньшего размера
      fit: "inside",
    })
    .toFile(filePath);

  return `/uploads/${newFileName}`;
};
