#!/usr/bin/env bash
# Локальный CI: те же проверки, что .github/workflows/ci.yml, одной командой — `npm run ci:local` (из web/).
# Всё идёт на чистых БД в dev-контейнере Postgres, e2e — против прод-сборки (next start),
# поэтому нет таймаутов на холодной компиляции страниц, протухших дат сида и остатков rate-limit.
# Lighthouse локально не запускается (на Windows падает на очистке временных файлов).
set -u
cd "$(dirname "$0")/.."

PG_CONTAINER="${CI_LOCAL_PG_CONTAINER:-petproject-pg-5435}"
PG_PORT="${CI_LOCAL_PG_PORT:-5435}"
PORT="${CI_LOCAL_PORT:-3199}"
LOG_DIR=".ci-local"
mkdir -p "$LOG_DIR"

export PAYLOAD_SECRET=ci-test-secret-32-characters-aaaa
export TELEGRAM_BOT_USERNAME=pet_aggregator_bot
export NEXT_PUBLIC_APP_URL="http://localhost:$PORT"
DB_CHECK="postgresql://pet:pet@localhost:$PG_PORT/pet_migrate_check"
DB_TEST="postgresql://pet:pet@localhost:$PG_PORT/pet_ci_local"

SERVER_PID=""
stop_server() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  if command -v taskkill >/dev/null 2>&1; then
    # на Windows дочерний node переживает kill родителя — снимаем по порту
    for pid in $(netstat -ano 2>/dev/null | grep ":$PORT " | grep LISTEN | awk '{print $5}' | sort -u); do
      taskkill //F //T //PID "$pid" >/dev/null 2>&1
    done
  fi
}
trap stop_server EXIT

fail() { echo; echo "CI-LOCAL: ПРОВАЛ — $1"; [ -n "${2:-}" ] && { echo "--- хвост $2:"; tail -30 "$2"; }; exit 1; }

# step <имя> <команда...> — вывод в лог, в консоль одна строка
step() {
  local name="$1"; shift
  local log="$LOG_DIR/$name.log"
  printf '%-22s ' "$name"
  local t0=$SECONDS
  if "$@" > "$log" 2>&1; then echo "ok ($((SECONDS - t0)) с)"; else echo "ПРОВАЛ"; fail "$name" "$log"; fi
}

fresh_db() {
  docker exec "$PG_CONTAINER" psql -U pet -d postgres -q \
    -c "DROP DATABASE IF EXISTS $1 WITH (FORCE);" -c "CREATE DATABASE $1;"
}

migrations_check() {
  DATABASE_URL="$DB_CHECK" NODE_ENV=production npm run migrate || return 1
  local before after
  before=$(ls migrations | wc -l)
  DATABASE_URL="$DB_CHECK" npm run migrate:create -- drift-check --skip-empty || return 1
  after=$(ls migrations | wc -l)
  if [ "$before" != "$after" ]; then
    echo "Коллекции изменены без миграции — запусти npm run migrate:create"; ls -t migrations | head -2; return 1
  fi
}

wait_server() {
  for _ in $(seq 1 90); do
    curl -s -o /dev/null -m 3 "http://localhost:$PORT/api/health" && return 0
    sleep 1
  done
  return 1
}

echo "== Локальный CI (порт $PORT, Postgres $PG_CONTAINER) =="

docker info >/dev/null 2>&1 || fail "Docker не запущен — открой Docker Desktop и повтори"
docker start "$PG_CONTAINER" >/dev/null 2>&1 || fail "нет контейнера $PG_CONTAINER"
for _ in $(seq 1 30); do docker exec "$PG_CONTAINER" pg_isready -U pet >/dev/null 2>&1 && break; sleep 1; done
stop_server

step db-reset        bash -c "$(declare -f fresh_db); PG_CONTAINER=$PG_CONTAINER; fresh_db pet_migrate_check && fresh_db pet_ci_local"
step migrations      migrations_check
step typecheck       npm run typecheck
step lint            npm run lint
step unit            env DATABASE_URL="$DB_TEST" npm test
step seed            env DATABASE_URL="$DB_TEST" npm run seed
step seed-content    env DATABASE_URL="$DB_TEST" npm run seed:content
step build           env DATABASE_URL="$DB_TEST" npm run build

printf '%-22s ' "server"
DATABASE_URL="$DB_TEST" npx next start -p "$PORT" > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
if wait_server; then echo "ok"; else echo "ПРОВАЛ"; fail "сервер не поднялся" "$LOG_DIR/server.log"; fi

step e2e             env DATABASE_URL="$DB_TEST" E2E_PORT="$PORT" npx playwright test --reporter=line

echo
echo "CI-LOCAL: ВСЁ ЗЕЛЁНОЕ"
grep -E "Tests +[0-9]+ passed" "$LOG_DIR/unit.log" | tail -1
grep -E "^ +[0-9]+ passed" "$LOG_DIR/e2e.log" | tail -1
