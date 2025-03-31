import { User } from "../../database/shema";
import type { IUser } from "./interfaces/IUser";

export class UserService {
  // Получить пользователя по Telegram ID
  static async getUserByTelegramId(
    telegramId: number | undefined
  ): Promise<IUser | null> {
    if (!telegramId) {
      return null;
    }

    return await User.findOne({ telegramId });
  }

  // Создать нового пользователя
  static async createUser(
    userData: Pick<IUser, "telegramId" | "firstName" | "username">
  ) {
    await User.create(userData);
  }

  // Обновить номер телефона
  static async updateUserPhone(telegramId: number, phone: string) {
    await User.findOneAndUpdate({ telegramId }, { phone });
  }
}
