# fairytale-wanderings

Интернет-магазин (каталог + заказы) для небольшого магазина ручной работы. Монорепозиторий: клиент (Vue 3) + сервер (Bun/Hono) + PostgreSQL.

- Клиент: `client/` — Vue 3, Vite, Pinia, Tailwind.
- Сервер: `server/` — Bun, Hono, Drizzle ORM (PostgreSQL). Подробно — в `server/CLAUDE.md`.
- План развития — в `PLAN.md`.

---

## Требования

- **Bun** (последняя версия) — https://bun.sh
- **Docker** + Docker Compose — для PostgreSQL
- **Git**

Node.js отдельно не нужен — всё гоняется через Bun.

---

## Быстрый старт (5 шагов)

```bash
# 1. Зависимости (монорепо, ставит и client, и server)
bun install

# 2. Переменные окружения (см. раздел ниже) — создать .env файлы

# 3. Поднять базу
docker compose up -d postgres

# 4. Применить миграции и залить тестовые товары
cd server
bun run db:migrate
bun run db:seed

# 5. Запустить сервер и клиент (в двух терминалах)
bun run dev                 # сервер → http://localhost:3000   (из папки server)
cd ../client && bun run dev # клиент → http://localhost:5173
```

Открой http://localhost:5173 — должна показаться витрина с 5 товарами.

---

## Переменные окружения

Нужны **три** env-файла (в репозиторий не коммитятся). Скопируй из примеров и при необходимости поправь.

### 1. `.env.development` (в корне) — для docker-compose

Эти переменные читает контейнер Postgres и (при запуске в docker) приложение. Внутри docker-сети хост БД — `postgres`, порт `5432`.

```env
POSTGRES_USER=fairytale
POSTGRES_PASSWORD=fairytale
POSTGRES_DB=fairytale
DATABASE_URL=postgres://fairytale:fairytale@postgres:5432/fairytale
POSTGRES_PORT=15432
```

### 2. `server/.env` — для запуска сервера и миграций с хоста

С хоста БД доступна на `localhost:15432` (проброшенный порт из compose). Шаблон — `server/.env.example`.

```env
PORT=3000
DATABASE_URL=postgres://fairytale:fairytale@localhost:15432/fairytale
POSTGRES_USER=fairytale
POSTGRES_PASSWORD=fairytale
POSTGRES_DB=fairytale
UPLOAD_PATH=./test_uploads
BOT_TOKEN=
PUBLIC_SITE_URL=
```

Без `PUBLIC_SITE_URL` превью ссылок в мессенджерах не соберёт абсолютный `og:image`.

### 3. `client/.env` — адрес API для фронта

```env
VITE_API_URL=http://localhost:3000
```

> Важно: разница в `DATABASE_URL` между файлами. Внутри docker — хост `postgres:5432`; с хоста (миграции, `bun run dev`) — `localhost:15432`.

### Доставка СДЭК (необязательно)

На странице корзины покупатель выбирает пункт выдачи на карте — виджет
`@cdek-it/widget`. Ходит он не в СДЭК напрямую, а в наш сервер (`/cdek/service`),
поэтому креды интеграции остаются на бэкенде. Нужны три вещи в `server/.env`
(в docker — в корневом env-файле):

```env
CDEK_ACCOUNT=              # аккаунт интеграции из ЛК СДЭК (не логин от кабинета)
CDEK_SECURE_PASSWORD=      # пароль интеграции оттуда же
CDEK_API_URL=https://api.edu.cdek.ru/v2   # тестовый контур; боевой — https://api.cdek.ru/v2
CDEK_YANDEX_MAPS_API_KEY=  # ключ JS API Яндекс.Карт — на них рисуется карта ПВЗ
CDEK_FROM_CITY=Новосибирск # город-отправитель (показывается в виджете)
CDEK_FROM_CITY_CODE=270    # его код в справочнике СДЭК — по нему считаются тарифы
```

Код города обязателен: калькулятор СДЭК не резолвит отправителя по названию
(отвечает 400), поэтому без кода виджет не включается. Найти код — запросом к
справочнику через наш же прокси:

```bash
curl "http://localhost:3000/cdek/service?action=cities&country_codes=RU&city=Красноярск"
```

Доставка у магазина одна — СДЭК: покупатель выбирает пункт выдачи на карте,
выбора способа на витрине нет. Пока переменные пустые (или интеграция отвалилась),
включается запасной вариант — обычное поле адреса, чтобы заказ всё же можно было
оформить. Остальные настройки (город на карте по умолчанию,
коробка по умолчанию) — в `server/.env.example`.

Стоимость доставки считается по составу корзины: у товара в CRM есть вес и
габариты (в упакованном виде), у кого не заполнены — берётся коробка из
`CDEK_PARCEL_*`. Габариты важны не меньше веса: СДЭК тарифицирует по максимуму
из физического и объёмного веса (Д×Ш×В/5000 кг).

---

## База данных

```bash
docker compose up -d postgres   # поднять
docker compose logs -f postgres # логи (дождаться "database system is ready")
docker compose down             # остановить (данные в томе сохраняются)
docker compose down -v          # остановить и УДАЛИТЬ данные (чистый старт)
```

Миграции и данные (из папки `server/`):

```bash
bun run db:migrate    # применить миграции из server/drizzle
bun run db:seed       # залить 5 тестовых товаров
bun run db:generate   # сгенерировать новую миграцию после правки схемы
bun run db:push       # запушить схему без файла миграции (только dev)
```

---

## Запуск

### Разработка (двумя процессами)

| Что | Команда (из папки) | URL |
|---|---|---|
| Сервер | `bun run dev` (`server/`) | http://localhost:3000 |
| Клиент | `bun run dev` (`client/`) | http://localhost:5173 |

Проверка API: `http://localhost:3000/products` должен вернуть JSON со списком товаров.

### Целиком в docker (как в проде)

Один контейнер отдаёт и API, и собранный сайт: сервер раздаёт `client/dist`, а все
неизвестные пути возвращает как `index.html` — без этого `/admin` и `/product/:id`
открывались бы на 404 сервера. Миграции применяются при старте контейнера.

```bash
docker compose build        # собирает клиент и образ
docker compose up -d        # postgres + приложение → http://localhost:3000
docker compose logs -f app
```

Две переменные читает **сам docker compose** (для подстановки `${...}`), а не
`env_file`, — их задают в окружении оболочки или в корневом `.env`:

| Переменная | Зачем | По умолчанию |
|---|---|---|
| `VITE_API_URL` | адрес API вшивается в бандл **на сборке** — в проде это домен магазина | `http://localhost:3000` |
| `APP_PORT` | порт магазина на хосте (внутри контейнера всегда 3000) | `3000` |

```bash
# порт 3000 занят локальным dev-сервером — поднять на другом
APP_PORT=3010 docker compose up -d

# сборка под прод-домен
VITE_API_URL=https://shop.example.com docker compose build
```

Картинки товаров живут в томе `uploads` (в контейнере — `/app/uploads`), поэтому
переживают пересборку образа.

---

## Тесты и проверки

```bash
# сервер
cd server && bun test   # или из корня репозитория: bun test (см. bunfig.toml)

# клиент: проверка типов и сборка
cd client && bun run type-check && bun run build
```

---

## Порты

| Сервис | Порт |
|---|---|
| Клиент (Vite, только dev) | 5173 |
| Сервер (Hono) — API и сайт | 3000 (на хосте — `APP_PORT`) |
| PostgreSQL (с хоста) | 15432 |

CORS на сервере уже разрешает `http://localhost:5173`.

---

## Траблшутинг

- **Контейнер БД в бесконечном рестарте, в логах `data directory ... incompatible` или `unused mount/volume`.** Том инициализирован другой версией Postgres. Лечится сносом тома (данные в dev не жалко): `docker compose down -v && docker compose up -d postgres`. Для PG18+ том монтируется на `/var/lib/postgresql` (уже настроено в `compose.yml`).
- **`Could not find a declaration file for module 'zod'` / битые типы.** Неполная установка зависимостей. Удалить `node_modules` и переустановить: `Remove-Item -Recurse -Force node_modules; bun install` (PowerShell) или `rm -rf node_modules && bun install`.
- **`Could not load the "sharp" module`.** Не встал нативный бинарник sharp под платформу — переустановить зависимости (`bun install`), при необходимости с пересборкой optional-зависимостей.
- **Порт занят (3000/5173/15432).** Поменять `PORT` (server/.env), порт Vite (`client/vite.config.ts`) или `POSTGRES_PORT` (.env.development). Для docker — `APP_PORT=3010 docker compose up -d`.
- **В docker сайт открывается, но пустой, а в консоли ошибки запросов к API.** Образ собран с чужим `VITE_API_URL` (адрес вшивается на сборке) — пересобрать: `VITE_API_URL=<адрес магазина> docker compose build`.
- **Сервер не видит БД (`ECONNREFUSED`).** Проверь, что в `server/.env` хост `localhost:15432` (а не `postgres`), и контейнер поднят.

---

## Структура

```
.
├─ client/           # Vue 3 + Vite
├─ server/           # Bun + Hono + Drizzle  (см. server/CLAUDE.md)
│  ├─ src/
│  └─ drizzle/       # SQL-миграции
├─ Dockerfile        # сборка клиента + образ приложения (bun)
├─ compose.yml       # приложение + PostgreSQL
├─ PLAN.md           # дорожная карта
└─ README.md
```

---

## Безопасность

- `.env` файлы не коммитить (уже в `.gitignore`).
- Перед публичным деплоем: сменить пароль БД и `BOT_TOKEN`, не публиковать порт Postgres наружу, настроить домен + SSL.
