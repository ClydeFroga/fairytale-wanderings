import path from "path";
import sharp from "sharp";

// Минимальная валидная картинка — sharp должен её принять и сконвертировать в webp.
export async function pngFile(name: string): Promise<File> {
  const buffer = await sharp({
    create: { width: 4, height: 4, channels: 3, background: "#c08a5a" },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(buffer)], name, { type: "image/png" });
}

/** Абсолютный путь к загруженному файлу (UPLOAD_PATH ставит preload). */
export function uploadedPath(relative: string): string {
  return path.resolve(process.env.UPLOAD_PATH || "", relative);
}
