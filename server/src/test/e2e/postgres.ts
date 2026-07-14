import { PostgreSqlContainer } from "@testcontainers/postgresql";
import path from "node:path";

const COMPOSE_TEST_URL = "postgres://fairytale:test@localhost:15433/fairytale_test";
const COMPOSE_FILE = path.join(import.meta.dir, "../../../../compose.test.yml");

export interface PostgresInstance {
  url: string;
  stop: () => Promise<void>;
}

async function startViaCompose(): Promise<PostgresInstance> {
  const proc = Bun.spawn(
    ["docker", "compose", "-f", COMPOSE_FILE, "up", "-d", "--wait"],
    { stdout: "inherit", stderr: "inherit" },
  );
  const code = await proc.exited;
  if (code !== 0) throw new Error("Не удалось поднять postgres-test через docker compose");

  return {
    url: COMPOSE_TEST_URL,
    stop: async () => {
      const down = Bun.spawn(
        ["docker", "compose", "-f", COMPOSE_FILE, "down", "-v"],
        { stdout: "inherit", stderr: "inherit" },
      );
      if ((await down.exited) !== 0) throw new Error("Не удалось остановить postgres-test");
    },
  };
}

async function startViaTestcontainers(): Promise<PostgresInstance> {
  const container = await new PostgreSqlContainer("postgres:18.4-alpine").start();
  return {
    url: container.getConnectionUri(),
    stop: async () => {
      await container.stop();
    },
  };
}

export async function startPostgres(): Promise<PostgresInstance> {
  if (process.env.TEST_DATABASE_URL) {
    return { url: process.env.TEST_DATABASE_URL, stop: async () => {} };
  }

  try {
    return await startViaTestcontainers();
  } catch {
    console.warn("Testcontainers недоступен, используем compose.test.yml");
    return startViaCompose();
  }
}
