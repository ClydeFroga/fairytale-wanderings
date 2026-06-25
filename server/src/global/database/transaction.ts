import { db, type DB } from "./DatabaseSingleton";

export function runInTransaction<T>(fn: (tx: DB) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
