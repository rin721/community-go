#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="console-platform:local"
CONTAINER_NAME="console-platform-smoke"
HOST_PORT="19998"
CONTAINER_PORT="9999"
TIMEOUT_SECONDS="90"
SKIP_BUILD="0"
KEEP_CONTAINER="0"

usage() {
  cat <<'EOF'
Usage: scripts/docker-smoke.sh [options]

Options:
  --image NAME            Docker image name. Default: console-platform:local
  --container NAME        Temporary container name. Default: console-platform-smoke
  --host-port PORT        Host port. Default: 19998
  --container-port PORT   Container port. Default: 9999
  --timeout SECONDS       Endpoint wait timeout. Default: 90
  --skip-build            Reuse an existing image.
  --keep-container        Keep the container for inspection.
  -h, --help              Show this help.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --image)
      IMAGE_NAME="${2:?missing image name}"
      shift 2
      ;;
    --container)
      CONTAINER_NAME="${2:?missing container name}"
      shift 2
      ;;
    --host-port)
      HOST_PORT="${2:?missing host port}"
      shift 2
      ;;
    --container-port)
      CONTAINER_PORT="${2:?missing container port}"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SECONDS="${2:?missing timeout}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD="1"
      shift
      ;;
    --keep-container)
      KEEP_CONTAINER="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is not available. Install Docker or run this script on a Docker-enabled host." >&2
  exit 127
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONTAINER_STARTED="0"

cleanup() {
  if [ "${CONTAINER_STARTED}" = "1" ] && [ "${KEEP_CONTAINER}" != "1" ]; then
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  elif [ "${CONTAINER_STARTED}" = "1" ]; then
    echo "Keeping smoke container ${CONTAINER_NAME} for inspection."
  fi
}
trap cleanup EXIT

wait_for_endpoint() {
  local name="$1"
  local url="$2"
  local pattern="$3"
  local deadline
  local body
  local last_error=""

  deadline=$((SECONDS + TIMEOUT_SECONDS))
  while [ "${SECONDS}" -lt "${deadline}" ]; do
    if body="$(curl -fsS --max-time 5 "${url}" 2>&1)"; then
      if grep -Eq "${pattern}" <<<"${body}"; then
        printf '%-12s %s\n' "${name}" "${url}"
        return 0
      fi
      last_error="unexpected response"
    else
      last_error="${body}"
    fi
    sleep 0.75
  done

  echo "Endpoint check timed out: ${url}; last error: ${last_error}" >&2
  return 1
}

cd "${REPO_ROOT}"

if [ "${SKIP_BUILD}" != "1" ]; then
  echo "Building Docker image ${IMAGE_NAME} ..."
  docker build -t "${IMAGE_NAME}" .
fi

if [ "$(docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format "{{.Names}}")" = "${CONTAINER_NAME}" ]; then
  echo "Removing existing smoke container ${CONTAINER_NAME} ..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

echo "Starting Docker smoke container ${CONTAINER_NAME} on http://127.0.0.1:${HOST_PORT} ..."
docker run \
  --detach \
  --name "${CONTAINER_NAME}" \
  --publish "${HOST_PORT}:${CONTAINER_PORT}" \
  --env "APP_SERVER_HOST=0.0.0.0" \
  --env "APP_SERVER_PORT=${CONTAINER_PORT}" \
  --env "APP_DB_DRIVER=sqlite" \
  --env "APP_DB_SQLITE_PATH=/app/data/docker-smoke.db" \
  --env "APP_STORAGE_DRIVER=local" \
  --env "APP_STORAGE_LOCAL_BASE_PATH=/app/data/uploads" \
  --env "APP_LOG_FILE_PATH=/app/logs/docker-smoke.log" \
  --env "APP_AUTH_NOTIFICATION_DRIVER=debug" \
  --env "APP_AUTH_SIGNING_KEY=docker-smoke-signing-key-change-me-32-bytes" \
  --env "APP_AUTH_REFRESH_TOKEN_PEPPER=docker-smoke-refresh-pepper-32-bytes" \
  --env "APP_AUTH_MFA_SECRET_KEY=docker-smoke-mfa-secret-key-32-bytes" \
  "${IMAGE_NAME}" >/dev/null
CONTAINER_STARTED="1"

BASE_URL="http://127.0.0.1:${HOST_PORT}"
echo "Checking Docker smoke endpoints ..."
wait_for_endpoint "health" "${BASE_URL}/health" '"status"[[:space:]]*:[[:space:]]*"ok"' || {
  docker logs --tail 200 "${CONTAINER_NAME}" >&2 || true
  exit 1
}
wait_for_endpoint "ready" "${BASE_URL}/ready" '"status"[[:space:]]*:[[:space:]]*"ready"' || {
  docker logs --tail 200 "${CONTAINER_NAME}" >&2 || true
  exit 1
}
wait_for_endpoint "openapi" "${BASE_URL}/openapi.yaml" '"?openapi"?[[:space:]]*:[[:space:]]*"?3' || {
  docker logs --tail 200 "${CONTAINER_NAME}" >&2 || true
  exit 1
}
wait_for_endpoint "admin" "${BASE_URL}/admin" "__reactRouterContext|console-hydrate" || {
  docker logs --tail 200 "${CONTAINER_NAME}" >&2 || true
  exit 1
}

echo "Docker smoke passed for image ${IMAGE_NAME}."
