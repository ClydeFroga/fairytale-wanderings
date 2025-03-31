import { DatabaseSingleton } from "./global/database/DatabaseSingleton";
import { Bot } from "./bot/main";
import { Hono } from "hono";
import products from "./routes/products";
const app = new Hono();

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

app.route("/products", products);

export default {
  port: 3000,
  fetch: app.fetch,
};
