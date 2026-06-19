import { eq } from "drizzle-orm";
import { db } from "../../database/DatabaseSingleton";
import { users } from "../../database/shema";
import type { IUser, INewUser } from "../../database/shema";

export class UserService {
  // Получить пользователя по Telegram ID
  static async getUserByTelegramId(
    telegramId: number | undefined
  ): Promise<IUser | null> {
    if (!telegramId) return null;

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    return row ?? null;
  }

  // Создать нового пользователя
  static async createUser(
    userData: Pick<INewUser, "telegramId" | "firstName" | "username">
  ) {
    await db.insert(users).values(userData);
  }

  // Обновить номер телефона
  static async updateUserPhone(telegramId: number, phone: string) {
    await db.update(users).set({ phone }).where(eq(users.telegramId, telegramId));
  }
}
