#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Update an installed Mission Control deployment.

Usage:
  ./scripts/update.sh [--version <tag-or-branch>]

Environment overrides:
  MC_VERSION
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

version="${MC_VERSION:-latest}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      version="$2"
      shift 2
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

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required." >&2
  exit 1
fi

if [ ! -d .git ]; then
  echo "Run this script from the Mission Control install directory." >&2
  exit 1
fi

git fetch --tags --prune origin

if [ "$version" = "latest" ]; then
  target_ref="$(git tag --sort=-v:refname | head -n1 || true)"
  if [ -z "$target_ref" ]; then
    target_ref="origin/main"
  fi
else
  target_ref="$version"
fi

git checkout "$target_ref"

docker compose -f docker-compose.prod.yml up -d --build

echo "Mission Control updated to $(git describe --tags --always)."
