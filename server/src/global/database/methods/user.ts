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

  static async updatePhone(telegramId: number, phone: string): Promise<void> {
    await db.update(users).set({ phone }).where(eq(users.telegramId, telegramId));
  }
}
