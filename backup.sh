#!/usr/bin/env bash
# Бэкап на сервере: дамп базы и архив загруженных файлов (картинки, оферта,
# политика) в ./backups. Запуск из корня репозитория: ./backup.sh
# По расписанию — через cron, см. README («Деплой на сервере»).
#
# Копии лежат на том же диске: от случайного удаления спасают, от потери сервера —
# нет. Их нужно ещё и уносить с сервера (скачать к себе или выгрузить в облако).
set -euo pipefail

cd "$(dirname "$0")"

KEEP_DAYS=${KEEP_DAYS:-7}
DIR=backups
STAMP=$(date +%Y-%m-%d_%H-%M)
mkdir -p "$DIR"

# Имя пользователя и базы — из env контейнера, чтобы не дублировать их здесь.
# --clean: дамп сам удаляет таблицы перед созданием, поэтому его можно накатить
# и на базу, где приложение уже создало пустую схему миграциями.
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists' \
  | gzip > "$DIR/db-$STAMP.sql.gz"

docker compose exec -T app tar czf - -C /app/uploads . > "$DIR/uploads-$STAMP.tar.gz"

# Диск маленький — старые копии удаляем.
find "$DIR" -name 'db-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
find "$DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

ls -lh "$DIR"
