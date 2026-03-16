#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Bootstrap Mission Control from the public GitHub repository.

Usage:
  bash bootstrap-public.sh [--dir <target-dir>] [--version <tag-or-branch>]

Environment overrides:
  MC_REPO_URL
  MC_INSTALL_DIR
  MC_VERSION
  MC_OWNER_EMAIL
  MC_OWNER_PASSWORD
  MC_AUTH_SECRET
  MC_POSTGRES_PASSWORD
  MC_APP_PORT
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

repo_url="${MC_REPO_URL:-https://github.com/vluyet/mission-control.git}"
install_dir="${MC_INSTALL_DIR:-/opt/mission-control}"
version="${MC_VERSION:-latest}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --repo)
      repo_url="$2"
      shift 2
      ;;
    --dir)
      install_dir="$2"
      shift 2
      ;;
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
require_command curl

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required." >&2
  exit 1
fi

parent_dir="$(dirname "$install_dir")"
if [ ! -d "$parent_dir" ]; then
  if [ -w "$(dirname "$parent_dir")" ]; then
    mkdir -p "$parent_dir"
  elif command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p "$parent_dir"
  else
    echo "Cannot create $parent_dir without sudo." >&2
    exit 1
  fi
fi

if [ -e "$install_dir" ] && [ -n "$(find "$install_dir" -mindepth 1 -maxdepth 1 2>/dev/null | head -n1)" ]; then
  echo "Target directory already exists and is not empty: $install_dir" >&2
  exit 1
fi

if [ ! -d "$install_dir" ]; then
  if [ -w "$parent_dir" ]; then
    mkdir -p "$install_dir"
  elif command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p "$install_dir"
    sudo chown "$(id -un):$(id -gn)" "$install_dir"
  else
    echo "Cannot create $install_dir without sudo." >&2
    exit 1
  fi
fi

if [ -n "$(find "$install_dir" -mindepth 1 -maxdepth 1 2>/dev/null | head -n1)" ]; then
  echo "Target directory already exists and is not empty: $install_dir" >&2
  exit 1
fi

git clone "$repo_url" "$install_dir"
cd "$install_dir"

git fetch --tags --prune

if [ "$version" = "latest" ]; then
  latest_tag="$(git tag --sort=-v:refname | head -n1 || true)"
  if [ -n "$latest_tag" ]; then
    git checkout "$latest_tag"
  fi
else
  git checkout "$version"
fi

owner_email="${MC_OWNER_EMAIL:-owner@example.com}"
owner_password="${MC_OWNER_PASSWORD:-$(generate_secret)}"
auth_secret="${MC_AUTH_SECRET:-$(generate_secret)}"
postgres_password="${MC_POSTGRES_PASSWORD:-$(generate_secret)}"
app_port="${MC_APP_PORT:-3000}"

if [ ! -f .env ]; then
  cat > .env <<EOF
DATABASE_URL=postgresql://mission_control:${postgres_password}@db:5432/mission_control?schema=public
POSTGRES_DB=mission_control
POSTGRES_USER=mission_control
POSTGRES_PASSWORD=${postgres_password}
APP_PORT=${app_port}
NEXT_PUBLIC_APP_NAME=Mission Control
OWNER_EMAIL=${owner_email}
OWNER_PASSWORD=${owner_password}
AUTH_SECRET=${auth_secret}
EOF
fi

docker compose -f docker-compose.prod.yml up -d --build

cat <<EOF

Mission Control installed.

Directory: $(pwd)
Version: $(git describe --tags --always)
URL: http://localhost:${app_port}
Owner email: ${owner_email}
Owner password: ${owner_password}

Keep the generated .env file safe.
EOF
