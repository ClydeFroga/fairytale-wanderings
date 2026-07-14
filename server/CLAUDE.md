# CLAUDE.md — серверная часть (fairytale-wanderings)

Бэкенд интернет-магазина: каталог, заказы, остатки. Два канала заказа — сайт (гостевой checkout) и Telegram-бот (для пользователей с VPN). Оба пишут в одну БД.

## Стек

- **Runtime:** Bun
- **HTTP:** Hono
- **БД:** PostgreSQL 18 + **Drizzle ORM** (драйвер `node-postgres`)
- **Миграции:** drizzle-kit
- **Валидация:** zod + `@hono/zod-validator`
- **Изображения:** sharp (конвертация в webp при загрузке)
- **Бот:** telegraf

TypeScript строгий, `moduleResolution: bundler`, ESM. Алиасы: `@global/*` → `src/global/`, `@validators/*` → `src/utils/validators/` (`package.json` → `imports`, `tsconfig.json` → `paths`). Запускается напрямую через Bun (без сборки).

## Команды

```bash
bun run dev          # запуск сервера (src/index.ts)
bun test             # E2E-тесты (реальная БД в Docker, см. ниже)
bun run db:generate  # сгенерировать SQL-миграцию из схемы
bun run db:migrate   # применить миграции
bun run db:push      # запушить схему в БД без файла миграции (dev)
bun run db:seed      # залить 5 тестовых товаров
```

БД поднимается через docker-compose из корня репозитория (`docker compose up -d postgres`). С хоста Postgres доступен на порту **15432** (внутри сети compose — `postgres:5432`). Переменные — в корневом `.env.development` и `server/.env` (см. `server/.env.example`): `DATABASE_URL`, `POSTGRES_USER/PASSWORD/DB`, `BOT_TOKEN`.

## Структура и слои

```
src/
  app.ts                        # createApp() — Hono без CORS/бота/статики (для тестов и index)
  index.ts                      # точка входа: CORS, статика, serve
  middleware/
    errorHandler.ts             # обработчик app.onError
  routes/
    index.ts                    # монтирует /products и /orders
    products/                   # один роут — одна папка
      route.ts                  # хендлеры + бизнес-логика
      validator.ts              # zod-валидаторы
      helpers.ts                # вспомогательные функции роута (напр. mapFormToProduct)
      products.e2e.test.ts      # E2E-тесты роута (реальная БД)
    orders/
      route.ts
      validator.ts
      orders.e2e.test.ts
  test/e2e/                     # инфраструктура E2E: preload, postgres, migrate, reset
    preload.ts  postgres.ts  migrate.ts  db.ts
  global/
    database/
      DatabaseSingleton.ts      # пул + drizzle, экспортирует готовый `db`
      transaction.ts            # runInTransaction(fn) — обёртка над db.transaction
      types/                    # DTO запросов к БД (фильтры, сортировка и т.п.)
        product.ts  index.ts
      methods/                  # ТОЛЬКО обращения к БД (репозиторий)
        product.ts  order.ts  orderItem.ts  user.ts  category.ts
      shema/                    # Drizzle-схема, по файлу на сущность (+ index)
        productSchema.ts userSchema.ts orderSchema.ts categorySchema.ts index.ts
      seed/                     # данные и функции сидинга
        data.ts  seedProducts.ts
      seed.ts                   # CLI: bun run db:seed
    errors/                     # классы ошибок (AppError + наследники)
    mail/                       # SMTP-уведомление (nodemailer): mailer.ts + orderEmail.ts
    utils/                      # upload, deleteFile, formatPhoneNumber
  utils/
    validators/                 # переиспользуемые zod-схемы (@validators/*)
      query.ts  index.ts
  bot/                          # Telegram-бот (telegraf)
```

## Архитектурные правила (важно, соблюдать)

1. **Бизнес-логика — в роутах.** Проверки, расчёты, оркестрация, выбрасывание ошибок — в `routes/<name>/route.ts` (или в `helpers.ts` той же папки, если это чистый помощник запроса). Не выносить логику в методы БД.
2. **`database/methods/` — только обращения к БД.** Методы импортируют `db` из `DatabaseSingleton` и по умолчанию работают через него. Опциональный `conn: DB` (последний аргумент) — только для вызова внутри `runInTransaction`. Один файл на сущность, статические методы; методы разных сущностей друг друга не вызывают.
3. **Ошибки — централизованно в `global/errors/`.** Базовый класс `AppError(message, status)`; наследники задают `status` (`ProductNotFoundError` → 404, `InsufficientStockError` → 409). В роутах их просто `throw`, без `try/catch`.
4. **Единый обработчик ошибок** — `middleware/errorHandler.ts`, подключён `app.onError(errorHandler)`. `AppError` → `c.text(message, status)`, остальное логируется и отдаёт 500. Новые прикладные ошибки наследуй от `AppError` — middleware трогать не нужно.
5. **Схема — по файлам на сущность** в `shema/` (имя папки — исторический типо `shema`, не `schema`). Перечисления и связанные таблицы (orders + orderItems) держим вместе. Типы строк таблиц (`IProduct`, `INewOrder`) — рядом со схемой; вспомогательные типы запросов (фильтры, пагинация) — в `database/types/`.
6. **Цена и остаток — источник истины БД.** Цену позиции фиксируем из БД на момент заказа (не из запроса клиента). Остаток списываем условием `stock >= qty` (`ProductMethods.decrementStock`). Запись заказа (списание, `orders`, `order_items`) оркестрируется в роуте через `runInTransaction` — при ошибке транзакция откатывается целиком. Предварительная проверка в роуте остаётся до транзакции для раннего отказа; гонки ловит `decrementStock` внутри колбэка.

## Нюансы данных

- PK везде `uuid` (`defaultRandom`). У **products** JS-ключ намеренно `_id` (колонка `id`) и camelCase-поля (`image: string[]`, `isActive`, `details`, `stock`) — чтобы фронт-витрина работала без изменений. Колонки в БД — snake_case.
- `users` нужны только боту (идентификация — сам Telegram). У веб-заказов `userId = null` (гостевой checkout).
- Корзина живёт на клиенте; серверной таблицы корзины нет.

## Миграции

Изменил схему → `bun run db:generate` → проверь SQL в `drizzle/` → закоммить → `bun run db:migrate`. Файлы миграций (`drizzle/*.sql` + `meta/`) хранятся в репозитории.

## Тесты

E2E через `bun test` (preload в `bunfig.toml`). Тесты лежат рядом с роутами: `routes/<name>/*.e2e.test.ts`. Моки не используются — проверяется полный путь: HTTP → роут → методы БД → PostgreSQL.

**Жизненный цикл БД** (`src/test/e2e/preload.ts`):
1. Поднять ephemeral Postgres (testcontainers или fallback `compose.test.yml` на порту **15433**)
2. Накатить миграции из `drizzle/`
3. В `beforeEach` каждого теста — `resetDatabase()` (TRUNCATE + сид)
4. После всех тестов — disconnect и остановка контейнера (`down -v` для compose)

Нужен **Docker**. Переопределить URL: `TEST_DATABASE_URL=... bun test`.

Корневой `compose.test.yml` — только для тестов, dev-БД на 15432 не затрагивается.

## Состояние

- Веб-приём заказа: запись в БД со списанием остатка и сохранением имени/контакта — готово. Письмо владелице по SMTP при создании заказа — готово (`global/mail/`, `nodemailer`; шлётся после коммита транзакции, сбой почты не ломает заказ; без `SMTP_*`/`MAIL_TO` тихо пропускается).
- Бот: пока только регистрация (`/start` + телефон), оформление заказа не реализовано, запуск в `index.ts` закомментирован.
- Задел под оплату (`status`, `paymentMethod` в `orders`) и доставку СДЭК — на будущее.
