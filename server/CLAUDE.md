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
    requireAdmin.ts             # доступ к мутациям: кука сессии или админская initData
  routes/
    index.ts                    # монтирует /products, /orders, /users, /categories
    products/                   # один роут — одна папка
      route.ts                  # хендлеры + бизнес-логика
      validator.ts              # zod-валидаторы
      helpers.ts                # вспомогательные функции роута (напр. mapFormToProduct)
      products.e2e.test.ts      # E2E-тесты роута (реальная БД)
    orders/
      route.ts                  # создание заказа + список и смена статуса для CRM
      validator.ts
      statusFlow.ts             # цепочка статусов и допустимые переходы
      helpers.ts                # склейка заказов с их позициями
      delivery.ts               # пересчёт цены доставки СДЭК на сервере
      payment.ts                # подписанная ссылка на оплату заказа
      orders.e2e.test.ts
    cdek/
      route.ts                  # /cdek/config + /cdek/service — прокси для виджета ПВЗ
      cdek.e2e.test.ts
    payments/
      route.ts                  # /payments/config, Result/Success/Fail Робокассы
      helpers.ts                # письмо/уведомление об оплате, разбор InvId
      payments.e2e.test.ts
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
    cdek/                       # доставка СДЭК: config.ts (env) + api.ts (токен, прокси, кэш), parcel.ts (посылка для расчёта)
    robokassa/                  # config.ts (env) + signature.ts (подписи, чек, ссылка)
    payments/                   # expireOrders.ts — отмена неоплаченных заказов по сроку
    telegram/                   # initData.ts (проверка Mini App), admins.ts, webAppUrl.ts
    auth/                       # adminSession.ts — JWT-кука админки (hono/jwt)
    utils/                      # upload (сохранение/удаление картинок), slugify, formatPhoneNumber
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

## Доступ и права

Пароля нет — личность даёт Телеграм. Кто админ, решает `isAdmin()` (`global/telegram/admins.ts`): `ADMIN_TELEGRAM_IDS` в `.env` или `users.is_admin`.

- `POST /auth/login` (заголовок `Authorization: tma <initData>`) проверяет подпись Телеграма, сверяет права и ставит httpOnly-куку `admin_session` (JWT HS256 на 12 часов, `global/auth/adminSession.ts`; секрет — `ADMIN_JWT_SECRET`, иначе `BOT_TOKEN`). `POST /auth/logout` её сбрасывает.
- Мутации закрыты middleware `requireAdmin`: пускает по куке **или** по свежей админской `initData` в заголовке (initData живёт час, кука — смену). Нет ни того, ни другого → 401, не админ → 403. Новые мутирующие роуты закрывать так же: `app.post('/', requireAdmin, validator, handler)`.
- Чтение каталога и категорий открыто — это витрина.
- `ADMIN_AUTH_DISABLED=true` снимает проверку (только для CRM в браузере на localhost; в тестах переменная сбрасывается в `preload.ts`, поэтому e2e ходят с реальными админскими заголовками из `test/e2e/auth.ts`).

## Нюансы данных

- PK везде `uuid` (`defaultRandom`). У **products** JS-ключ намеренно `_id` (колонка `id`) и camelCase-поля (`image: string[]`, `isActive`, `details`, `stock`) — чтобы фронт-витрина работала без изменений. Колонки в БД — snake_case.
- Статус заказа: `created → paid → assembled → shipped → completed`, плюс `cancelled` вне цепочки. Двигать можно только вперёд (в том числе через шаг) и в `cancelled`; из `completed`/`cancelled` — никуда (`routes/orders/statusFlow.ts`). На каждой смене статуса телеграм-клиенту уходит уведомление (`global/notify/`), у веб-заказов `chat_id` нет — им не шлём.
- Категории: `slug` — стабильный ключ для фильтра витрины (`GET /products?category=<slug>`), генерируется из названия транслитом при создании и **не меняется** при переименовании. Названия уникальны без учёта регистра (проверка в роуте). Удаление категории обнуляет `products.category_id`, товары остаются.
- Картинки товара — массив относительных путей (`images/x.webp`) в `products.image`, файлы лежат в `UPLOAD_PATH/images` и раздаются сервером. Загрузка: повторяющееся поле формы `image` (Hono собирает одноимённые поля в массив), не больше `MAX_PRODUCT_IMAGES` (5). При `PATCH` набор задаётся полем `existingImages` (JSON-массив оставляемых путей) + новые файлы; выпавшие файлы удаляются с диска (`Upload.removeMany`). Первая картинка — обложка.
- `users` нужны только боту (идентификация — сам Telegram). У веб-заказов `userId = null` (гостевой checkout).
- **Параметры посылки у товара:** `weight` (граммы), `length/width/height` (см, в упакованном виде) — необязательные, `null` значит «нет своих», тогда клиент берёт коробку по умолчанию из `/cdek/config`. В форме товара пустое поле **очищает** колонку (`optionalNumber` в `routes/products/helpers.ts`), непришедшее — не трогает. Посылку на заказ собирает клиент (`client/src/scripts/parcel.ts`), потому что она уходит прямо в виджет.
- **Отправитель СДЭК — код города** (`CDEK_FROM_CITY_CODE`), не название: калькулятор отвечает 400 на `from_location` со строковым адресом. `GET /cdek/service?action=cities` — разовая настроечная ручка для поиска этого кода, виджет её не вызывает.
- **Доставка.** `deliveryMethod` — `cdek_office` / `cdek_door` / `manual`; у ПВЗ обязателен `deliveryPointCode` (проверяет валидатор). `deliveryPrice` — цена, которую виджет показал покупателю: она **не входит** в `totalPrice` и на сервере не пересчитывается (появится вместе с оплатой). Виджет ходит в `/cdek/service` — это ровно тот контракт, что описан в `service.php` из пакета `@cdek-it/widget` (`action=offices` → `deliverypoints`, `action=calculate` → `calculator/tarifflist`), поэтому менять формат ответа нельзя: его разбирает сам виджет. Заголовок `X-Total-Elements` от СДЭК пробрасывается наружу (по нему виджет считает страницы) и добавлен в `exposeHeaders` CORS.
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
- Бот (`bot/`, telegraf, запуск в `index.ts`; без `BOT_TOKEN` — тихий пропуск): `/start` регистрирует пользователя и даёт inline-кнопку Mini App, `contact` сохраняет телефон, `/admin` — вход в CRM для админов. Заказы оформляются в Mini App, а не сообщениями бота.
- Админы: `isAdmin(telegramId, dbUser)` в `global/telegram/admins.ts` — `ADMIN_TELEGRAM_IDS` из `.env` или флаг `users.is_admin`. Используют бот (кнопка «Панель управления») и `GET /users/me`. URL-ы Mini App — `global/telegram/webAppUrl.ts`.
- CRM (`/admin`): товары, категории и заказы полностью на API. Осталось из Этапа 5 — опт-ин уведомлений для веб-заказов (кнопка на «Заказ принят» + `notify_telegram_id`), сознательно отложен.
- Задел под оплату (`paymentMethod` в `orders`, статус `paid` выставляется вручную из CRM) и доставку СДЭК — на будущее.
