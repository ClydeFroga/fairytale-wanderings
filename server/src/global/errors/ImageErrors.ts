import { AppError } from "./AppError";

/** Картинок больше, чем разрешено (лимит — MAX_IMAGES в global/utils/upload.ts). */
export class TooManyImagesError extends AppError {
  constructor(public readonly max: number, public readonly received: number) {
    super(
      `Можно загрузить не более ${max} изображений (пришло ${received})`,
      400,
      "TOO_MANY_IMAGES",
      { max, received },
    );
  }
}

/** Файл не удалось обработать (не картинка, битый файл, sharp не справился). */
export class InvalidImageError extends AppError {
  constructor(public readonly fileName?: string) {
    super(
      fileName
        ? `Не удалось обработать изображение «${fileName}»`
        : "Не удалось обработать изображение",
      400,
      "INVALID_IMAGE",
      { fileName },
    );
  }
}
