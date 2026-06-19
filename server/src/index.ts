import { DatabaseSingleton } from "./global/database/DatabaseSingleton";
import { Bot } from "./bot/main";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import index from "./routes/index";

const app = new Hono();

// Применяем CORS ко всем маршрутам
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "https://mbbr6p2z-5173.euw.devtunnels.ms",
    ], // Разрешаем доступ только с вашего фронтенда
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true,
  })
);

await DatabaseSingleton.getInstance().connect();

async function startBot() {
  try {
    console.log("Запуск приложения...");

    const bot = new Bot(process.env.BOT_TOKEN || "");

    await bot.start();

    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));

    console.log("Приложение полностью запущено и готово к работе!");
  } catch (error) {
    console.error("Критическая ошибка при запуске приложения:", error);
    process.exit(1); // Завершаем процесс с ошибкой
  }
}

// startBot().catch((error) => {
//   console.error("Необработанная ошибка при запуске:", error);
// });

app.route("/", index);

app.use(
  "/images/*",
  serveStatic({
    root: "test_uploads",
    onNotFound: (filePath, c) => {
      console.log(`${filePath} is not found, you access ${c.req.path}`);
    },
  })
);

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
