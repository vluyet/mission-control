#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Install Mission Control from a Git repository.

Usage:
  ./scripts/install.sh [--repo <repo-url>] [--dir <target-dir>] [--version <tag-or-branch>]

Environment overrides:
  MC_REPO_URL
  MC_INSTALL_DIR
  MC_VERSION
  MC_COMPOSE_PROJECT_NAME
  MC_OWNER_EMAIL
  MC_OWNER_PASSWORD
  MC_AUTH_SECRET
  MC_POSTGRES_PASSWORD
  MC_APP_PORT
  MC_DB_PORT
  MC_INSTALL_SYSTEMD_USER=1
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp_file
  tmp_file="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    index($0, key "=") == 1 { print key "=" value; updated = 1; next }
    { print }
    END { if (!updated) print key "=" value }
  ' .env > "$tmp_file"
  mv "$tmp_file" .env
}

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :${port}" | awk 'NR>1 {print}' | grep -q .
    return
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi
  return 1
}

pick_available_port() {
  local start_port="$1"
  local port="$start_port"
  while port_in_use "$port"; do
    port=$((port + 1))
  done
  printf '%s\n' "$port"
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

resolve_target_ref() {
  local requested="$1"
  if [ "$requested" = "latest" ]; then
    local latest_tag
    latest_tag="$(git tag --sort=-v:refname | head -n1 || true)"
    if [ -n "$latest_tag" ]; then
      printf '%s\n' "$latest_tag"
    else
      printf '%s\n' 'origin/main'
    fi
    return
  fi
  if git show-ref --verify --quiet "refs/tags/$requested"; then printf '%s\n' "$requested"; return; fi
  if git show-ref --verify --quiet "refs/remotes/origin/$requested"; then printf '%s\n' "origin/$requested"; return; fi
  if git show-ref --verify --quiet "refs/heads/$requested"; then printf '%s\n' "$requested"; return; fi
  if git rev-parse --verify --quiet "$requested^{commit}" >/dev/null; then printf '%s\n' "$requested"; return; fi
  echo "Unknown target ref: $requested" >&2
  exit 1
}

resolve_branch_name() {
  local requested="$1"
  local candidate="${requested#origin/}"
  if [ "$requested" = "latest" ]; then return; fi
  if git show-ref --verify --quiet "refs/remotes/origin/$candidate" || git show-ref --verify --quiet "refs/heads/$candidate"; then
    printf '%s\n' "$candidate"
  fi
}

resolve_deploy_ref_label() {
  local requested="$1"
  if [ "$requested" = "latest" ]; then
    if git describe --tags --exact-match >/dev/null 2>&1; then
      git describe --tags --exact-match
    else
      git rev-parse --short HEAD
    fi
    return
  fi
  printf '%s\n' "$requested"
}

write_deployment_metadata() {
  local requested="$1"
  local ref_label branch version commit updated_at
  ref_label="$(resolve_deploy_ref_label "$requested")"
  branch="$(resolve_branch_name "$requested")"
  version="$(git describe --tags --always 2>/dev/null || git rev-parse --short HEAD)"
  commit="$(git rev-parse HEAD)"
  updated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  cat > app/DEPLOYMENT.json <<EOF
{
  "version": "$(json_escape "$version")",
  "branch": $(if [ -n "$branch" ]; then printf '"%s"' "$(json_escape "$branch")"; else printf 'null'; fi),
  "commit": "$(json_escape "$commit")",
  "ref": "$(json_escape "$ref_label")",
  "updatedAt": "$(json_escape "$updated_at")"
}
EOF
  set_env_value MISSION_CONTROL_VERSION "$version"
  set_env_value MISSION_CONTROL_BRANCH "$branch"
  set_env_value MISSION_CONTROL_COMMIT "$commit"
  set_env_value MISSION_CONTROL_DEPLOY_REF "$ref_label"
}

load_dotenv_exports() {
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    [[ "$line" == *=* ]] || continue
    local key="${line%%=*}"
    local value="${line#*=}"
    export "$key=$value"
  done < .env
}

ensure_db_stack() {
  docker compose -f docker-compose.prod.yml up -d db
}

wait_for_db() {
  local retries="${1:-30}"
  local delay="${2:-2}"
  local attempt=1
  while [ "$attempt" -le "$retries" ]; do
    if docker compose -f docker-compose.prod.yml exec -T db pg_isready -U "${POSTGRES_USER:-mission_control}" -d "${POSTGRES_DB:-mission_control}" >/dev/null 2>&1; then
      return 0
    fi
    echo "Waiting for PostgreSQL ($attempt/$retries)..."
    sleep "$delay"
    attempt=$((attempt + 1))
  done
  echo "PostgreSQL did not become ready." >&2
  return 1
}

build_host_app() {
  echo "Installing app dependencies and building host app..."
  (
    load_dotenv_exports
    cd app
    npm ci
    rm -rf .next-build
    npm run build
    npm run db:deploy
    npm run db:bootstrap
  )
}

write_user_service() {
  local target="${HOME}/.config/systemd/user/mission-control-app.service"
  mkdir -p "$(dirname "$target")"
  cat > "$target" <<EOF
[Unit]
Description=Mission Control App (host)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$(pwd)/app
EnvironmentFile=$(pwd)/.env
Environment=NODE_ENV=production
Environment=NEXT_DIST_DIR=.next-build
ExecStart=$(command -v node) $(pwd)/app/node_modules/next/dist/bin/next start -H 0.0.0.0 -p ${app_port}
Restart=always
RestartSec=2

[Install]
WantedBy=default.target
EOF
}

restart_host_app() {
  if command -v systemctl >/dev/null 2>&1 && [ "${MC_INSTALL_SYSTEMD_USER:-1}" = "1" ]; then
    write_user_service
    systemctl --user daemon-reload
    systemctl --user enable --now mission-control-app.service
  else
    echo "systemctl --user not available or disabled; starting host app in background." >&2
    (
      cd app
      nohup env NEXT_DIST_DIR=.next-build npm start -- -p "${app_port}" >/tmp/mission-control-install-app.log 2>&1 &
    )
  fi
}

wait_for_health() {
  local url="$1"
  local retries="${2:-30}"
  local delay="${3:-2}"
  local attempt=1
  while [ "$attempt" -le "$retries" ]; do
    if curl -fsS "$url" >/tmp/mission-control-health.json 2>/dev/null; then
      return 0
    fi
    echo "Waiting for health check ($attempt/$retries): $url"
    sleep "$delay"
    attempt=$((attempt + 1))
  done
  echo "Health check did not pass: $url" >&2
  return 1
}

repo_url="${MC_REPO_URL:-https://github.com/vluyet/mission-control.git}"
install_dir="${MC_INSTALL_DIR:-mission-control}"
version="${MC_VERSION:-latest}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --repo) repo_url="$2"; shift 2 ;;
    --dir) install_dir="$2"; shift 2 ;;
    --version) version="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

require_command git
require_command docker
require_command curl
require_command npm
if ! docker compose version >/dev/null 2>&1; then echo "docker compose is required." >&2; exit 1; fi

if [ -e "$install_dir" ] && [ -n "$(find "$install_dir" -mindepth 1 -maxdepth 1 2>/dev/null | head -n1)" ]; then
  echo "Target directory already exists and is not empty: $install_dir" >&2
  exit 1
fi

git clone "$repo_url" "$install_dir"
cd "$install_dir"
git fetch --tags --prune
target_ref="$(resolve_target_ref "$version")"
git checkout -f "$target_ref"

owner_email="${MC_OWNER_EMAIL:-owner@example.com}"
owner_password="${MC_OWNER_PASSWORD:-$(generate_secret)}"
auth_secret="${MC_AUTH_SECRET:-$(generate_secret)}"
postgres_password="${MC_POSTGRES_PASSWORD:-$(generate_secret)}"
compose_project_name="${MC_COMPOSE_PROJECT_NAME:-missioncontrol}"
app_port="${MC_APP_PORT:-3000}"
db_port="${MC_DB_PORT:-5432}"

if [ -z "${MC_APP_PORT:-}" ] && port_in_use "$app_port"; then
  app_port="$(pick_available_port "$((app_port + 1))")"
  echo "App port in use. Using ${app_port}."
fi
if [ -z "${MC_DB_PORT:-}" ] && port_in_use "$db_port"; then
  db_port="$(pick_available_port "$((db_port + 1))")"
  echo "DB port in use. Using ${db_port}."
fi

if [ ! -f .env ]; then
  cat > .env <<EOF
COMPOSE_PROJECT_NAME=${compose_project_name}
DATABASE_URL=postgresql://mission_control:${postgres_password}@127.0.0.1:${db_port}/mission_control?schema=public
POSTGRES_DB=mission_control
POSTGRES_USER=mission_control
POSTGRES_PASSWORD=${postgres_password}
DB_PORT=${db_port}
APP_PORT=${app_port}
NEXT_PUBLIC_APP_NAME=Mission Control
OWNER_EMAIL=${owner_email}
OWNER_PASSWORD=${owner_password}
AUTH_SECRET=${auth_secret}
EOF
fi

write_deployment_metadata "$version"
load_dotenv_exports
ensure_db_stack
wait_for_db
build_host_app
restart_host_app
wait_for_health "http://127.0.0.1:${app_port}/api/health"

cat <<EOF

Mission Control installed.

Directory: $(pwd)
Version: $(git describe --tags --always)
URL: http://localhost:${app_port}
Owner email: ${owner_email}
Owner password: ${owner_password}

Runtime model:
- host app via systemd user service
- PostgreSQL via docker-compose.prod.yml on host port ${db_port}

Keep the generated .env file safe.
EOF
