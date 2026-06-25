import { Hono } from "hono";
import { cors } from "hono/cors";
import routes from "./routes/index";
import { errorHandler } from "./middleware/errorHandler";

const corsMiddleware = cors({
  origin: ['http://localhost:5173'],
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
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
