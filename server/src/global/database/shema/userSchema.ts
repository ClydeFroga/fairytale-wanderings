import { pgTable, uuid, text, boolean, bigint, timestamp } from "drizzle-orm/pg-core";

// Пользователи нужны только для Telegram-бота (идентификация — сам Telegram).
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramId: bigint("telegram_id", { mode: "number" }).unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  username: text("username"),
  phone: text("phone"),
  isAdmin: boolean("is_admin").notNull().default(false),
  registeredAt: timestamp("registered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type IUser = typeof users.$inferSelect;
export type INewUser = typeof users.$inferInsert;
