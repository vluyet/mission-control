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

Environment overrides:
  MC_VERSION
  MC_NO_BUILD=1
  MC_HEALTHCHECK_URL
  MC_HEALTHCHECK_RETRIES
  MC_HEALTHCHECK_DELAY
USAGE
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
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

  printf '%s\n' "$requested"
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

echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

if [ "$no_build" = "1" ]; then
  echo "Starting containers without rebuild..."
  docker compose -f docker-compose.prod.yml up -d
else
  echo "Starting containers with rebuild..."
  docker compose -f docker-compose.prod.yml up -d --build
fi

echo "Waiting for Mission Control health endpoint..."
if ! wait_for_health "$healthcheck_url" "$healthcheck_retries" "$healthcheck_delay"; then
  echo "Mission Control failed health verification. Recent logs:" >&2
  docker compose -f docker-compose.prod.yml logs --tail=200 app >&2 || true
  exit 1
fi

echo "Mission Control updated to $(git describe --tags --always)."
