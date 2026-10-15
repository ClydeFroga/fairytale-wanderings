# syntax=docker/dockerfile:1

# Проект целиком на Bun (сервер запускает TypeScript напрямую, без сборки),
# поэтому и образ — bun, а не node.
FROM oven/bun:1 AS build
WORKDIR /app

# Сначала манифесты: слой с зависимостями переиспользуется, пока они не менялись.
COPY package.json bun.lock bunfig.toml ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

COPY . .

# Vite вшивает VITE_*-переменные в бандл на сборке — после сборки адрес API
# уже не поменять, поэтому он приходит аргументом (в проде — домен магазина).
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
# build-only, без type-check: проверка типов — дело CI, деплой она ронять не должна.
RUN bun run build:client

# --- зависимости для запуска: только прод-пакеты сервера ---
# Клиент в рантайме — уже собранные файлы, его пакеты (vue, vite, виджет СДЭК)
# серверу не нужны; dev-зависимости (drizzle-kit, testcontainers) и peer-ы
# (typescript, @types/*) — тоже. Образ от этого вдвое меньше (~430 МБ против ~850).
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile --production --filter server --omit=peer

# --- образ для запуска: сервер + собранный клиент ---
FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Картинки товаров лежат в volume (см. compose): в слое образа они не переживут
# пересборку. Пишутся и раздаются они по одному и тому же UPLOAD_PATH.
ENV UPLOAD_PATH=/app/uploads

COPY package.json bun.lock bunfig.toml ./
COPY client/package.json ./client/
COPY server ./server
# Линковка изолированная: пакеты лежат в node_modules/.bun, а server/node_modules —
# симлинки на них, поэтому нужны оба каталога.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000

# Миграции применяются при старте: отдельного шага деплоя нет, а забыть их легко.
# Через drizzle-orm, а не drizzle-kit — тот dev-зависимость и в образ не попадает.
CMD ["sh", "-c", "bun run db:migrate:deploy && bun run start"]
