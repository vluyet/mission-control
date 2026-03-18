#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Update an installed Mission Control deployment.

Usage:
  ./scripts/update.sh [--version <tag-or-branch>] [--no-build]

Examples:
  ./scripts/update.sh
  ./scripts/update.sh --version v0.1.8
  ./scripts/update.sh --version main
  ./scripts/update.sh --version feat/my-branch

Environment overrides:
  MC_VERSION
  MC_NO_BUILD=1
  MC_HEALTHCHECK_URL
  MC_HEALTHCHECK_RETRIES
  MC_HEALTHCHECK_DELAY
  MC_APP_RESTART_CMD
USAGE
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
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

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
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

  if git show-ref --verify --quiet "refs/tags/$requested"; then
    printf '%s\n' "$requested"
    return
  fi

  if git show-ref --verify --quiet "refs/remotes/origin/$requested"; then
    printf '%s\n' "origin/$requested"
    return
  fi

  if git show-ref --verify --quiet "refs/heads/$requested"; then
    printf '%s\n' "$requested"
    return
  fi

  if git rev-parse --verify --quiet "$requested^{commit}" >/dev/null; then
    printf '%s\n' "$requested"
    return
  fi

  echo "Unknown target ref: $requested" >&2
  exit 1
}

resolve_branch_name() {
  local requested="$1"
  local candidate="${requested#origin/}"

  if [ "$requested" = "latest" ]; then
    return
  fi

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
  local ref_label branch version commit short_commit updated_at

  ref_label="$(resolve_deploy_ref_label "$requested")"
  branch="$(resolve_branch_name "$requested")"
  version="$(git describe --tags --always 2>/dev/null || git rev-parse --short HEAD)"
  commit="$(git rev-parse HEAD)"
  short_commit="$(git rev-parse --short HEAD)"
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

  echo "Deployment metadata stamped: ${version} (${branch:-detached}@${short_commit})"
}

update_host_app() {
  echo "Installing app dependencies and building host app..."
  (
    set -a
    . ./.env
    set +a
    cd app
    npm ci
    if [ "$no_build" != "1" ]; then
      npm run build
    fi
    npm run db:deploy
    npm run db:bootstrap
  )
}

restart_host_app() {
  local restart_cmd="${MC_APP_RESTART_CMD:-}"

  if [ -z "$restart_cmd" ] && command -v systemctl >/dev/null 2>&1 && systemctl --user status mission-control-app.service >/dev/null 2>&1; then
    restart_cmd="systemctl --user restart mission-control-app.service"
  fi

  if [ -z "$restart_cmd" ]; then
    echo "No host app restart command configured. Set MC_APP_RESTART_CMD if your test machine does not use mission-control-app.service." >&2
    return 0
  fi

  echo "Restarting host app..."
  sh -lc "$restart_cmd"
}

wait_for_health() {
  local url="$1"
  local retries="$2"
  local delay="$3"
  local attempt=1

  while [ "$attempt" -le "$retries" ]; do
    if curl -fsS "$url" >/tmp/mission-control-health.json 2>/dev/null; then
      echo "Health check passed: $url"
      cat /tmp/mission-control-health.json
      echo
      return 0
    fi

    echo "Waiting for health check ($attempt/$retries): $url"
    sleep "$delay"
    attempt=$((attempt + 1))
  done

  echo "Health check did not pass: $url" >&2
  return 1
}

version="${MC_VERSION:-latest}"
no_build="${MC_NO_BUILD:-0}"
healthcheck_url="${MC_HEALTHCHECK_URL:-}"
healthcheck_retries="${MC_HEALTHCHECK_RETRIES:-30}"
healthcheck_delay="${MC_HEALTHCHECK_DELAY:-2}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      version="$2"
      shift 2
      ;;
    --no-build)
      no_build=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_command git
require_command docker
require_command curl
require_command npm

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required." >&2
  exit 1
fi

if [ ! -d .git ] || [ ! -f docker-compose.prod.yml ]; then
  echo "Run this script from the Mission Control install directory." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "Missing .env in install directory." >&2
  exit 1
fi

current_ref="$(git describe --tags --always 2>/dev/null || git rev-parse --short HEAD)"
app_port="$(awk -F= '$1=="APP_PORT" {print $2}' .env | tail -n1)"
app_port="${app_port:-3000}"

if [ -z "$healthcheck_url" ]; then
  healthcheck_url="http://127.0.0.1:${app_port}/api/health"
fi

echo "Current version: ${current_ref}"
echo "Fetching latest refs and tags..."
git fetch --tags --prune origin

target_ref="$(resolve_target_ref "$version")"
echo "Target version: ${target_ref}"

git checkout -f "$target_ref"
write_deployment_metadata "$version"

echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

if [ "$no_build" = "1" ]; then
  echo "Starting containers without rebuild..."
  docker compose -f docker-compose.prod.yml up -d
else
  echo "Starting containers with rebuild..."
  docker compose -f docker-compose.prod.yml up -d --build
fi

update_host_app
restart_host_app

echo "Waiting for Mission Control health endpoint..."
if ! wait_for_health "$healthcheck_url" "$healthcheck_retries" "$healthcheck_delay"; then
  echo "Mission Control failed health verification. Recent logs:" >&2
  docker compose -f docker-compose.prod.yml logs --tail=200 db >&2 || true
  exit 1
fi

echo "Mission Control updated to $(git describe --tags --always)."
