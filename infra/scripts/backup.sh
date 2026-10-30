#!/usr/bin/env sh
# Daily backup of all EMS databases (employee_db, leave_db, keycloak_db). Run on the VPS from the repo root,
# e.g. via cron:  0 2 * * *  cd /opt/ems && sh infra/scripts/backup.sh >> /var/log/ems-backup.log 2>&1
# Keeps 14 days. Copy the folder off the server too (and keep EMS_ENCRYPTION_KEY with it).
set -eu
DIR=${BACKUP_DIR:-/var/backups/ems}
KEEP_DAYS=${KEEP_DAYS:-14}
STAMP=$(date +%Y-%m-%d_%H%M)
COMPOSE="docker compose -f infra/docker-compose.prod.yml --env-file infra/.env"
mkdir -p "$DIR"
for db in employee_db leave_db keycloak_db; do
  $COMPOSE exec -T postgres sh -c "pg_dump -U \"\$POSTGRES_USER\" -Fc $db" > "$DIR/${db}_$STAMP.dump"
done
find "$DIR" -name '*.dump' -mtime +"$KEEP_DAYS" -delete
echo "$(date) backup ok: $DIR/*_$STAMP.dump"
# Restore one database:
#   docker compose -f infra/docker-compose.prod.yml --env-file infra/.env exec -T postgres \
#     sh -c 'pg_restore -U "$POSTGRES_USER" -d employee_db --clean --if-exists' < /var/backups/ems/employee_db_<stamp>.dump
