import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./shema";

class DatabaseSingleton {
  private static instance: DatabaseSingleton;

  private readonly pool: Pool;
  public readonly db: NodePgDatabase<typeof schema>;

  private constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(this.pool, { schema });
  }

  public static getInstance(): DatabaseSingleton {
    if (!DatabaseSingleton.instance) {
      DatabaseSingleton.instance = new DatabaseSingleton();
    }
    return DatabaseSingleton.instance;
  }

  public async connect() {
    try {
      console.log("Подключение к PostgreSQL...");
      await this.pool.query("SELECT 1");
      console.log("Успешное подключение к PostgreSQL!");
    } catch (error) {
      console.error("Ошибка подключения к PostgreSQL:", error);
      throw error;
    }
  }

  public async disconnect() {
    await this.pool.end();
  }
}

export { DatabaseSingleton };

// Готовый drizzle-инстанс для сервисов.
export const db = DatabaseSingleton.getInstance().db;
