import { Hono } from "hono";
import { cors } from "hono/cors";
import routes from "./routes/index";
import { errorHandler } from "./middleware/errorHandler";

// Домены фронта: с credentials: true подстановка "*" запрещена, поэтому список
// задаётся явно (в проде — CORS_ORIGINS через запятую).
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin: allowedOrigins,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  // X-Total-Elements читает виджет СДЭК (постраничная загрузка ПВЗ) — в dev
  // сайт и API на разных портах, без expose заголовок до него не доедет.
  exposeHeaders: ["Content-Length", "X-Kuma-Revision", "X-Total-Elements"],
  maxAge: 600,
  credentials: true,
});

/** Минимальное приложение для E2E-тестов (без CORS и статики). */
export function createApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.route("/", routes);
  return app;
}

/** Продакшен/dev-сборка с CORS. */
export function createServerApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.use("*", corsMiddleware);
  app.route("/", routes);
  return app;
}
