import { eq } from "drizzle-orm";
import { db } from "../DatabaseSingleton";
import { users } from "../shema";
import type { IUser, INewUser } from "../shema";

export class UserMethods {
  static async getByTelegramId(telegramId: number | undefined): Promise<IUser | null> {
    if (!telegramId) return null;
    const [row] = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    return row ?? null;
  }

  static async create(data: Pick<INewUser, "telegramId" | "firstName" | "username">): Promise<void> {
    await db.insert(users).values(data);
  }

  // Создаёт пользователя по telegramId либо обновляет имя/username/телефон, если уже есть.
  // Возвращает строку (нужен id для привязки к заказу).
  static async upsertByTelegram(
    data: Pick<INewUser, "telegramId" | "firstName" | "lastName" | "username" | "phone">,
  ): Promise<IUser> {
    const set: Partial<INewUser> = {
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
    };
    // Телефон обновляем только если он передан — чтобы не затирать сохранённый номер пустым.
    if (data.phone) set.phone = data.phone;

    const [row] = await db
      .insert(users)
      .values(data)
      .onConflictDoUpdate({ target: users.telegramId, set })
      .returning();
    return row!;
  }

  static async updatePhone(telegramId: number, phone: string): Promise<void> {
    await db.update(users).set({ phone }).where(eq(users.telegramId, telegramId));
  }
}
