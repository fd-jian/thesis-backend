#!/bin/sh

# Restore backup of grafana container. Lates backup will be restored 
# from $ROOT_PROJECT_DIR/grafana/backup unless specified. PWD is used for
# ROOT_PROJECT_DIR if not specified.
# 
# Usage: grafana_backup [BACKUP_FILE] [ROOT_PROJECT_DIR]

ROOT_PROJECT_DIR="${2:-.}"
ROOT_PROJECT_PATH="$(readlink -f "$ROOT_PROJECT_DIR")"
PROJECT_NAME=$(basename "$ROOT_PROJECT_PATH")
BACKUP_DIR="$ROOT_PROJECT_PATH"/grafana/backup
BACKUP_FILE_PATH="${1:-$(find "$BACKUP_DIR" -name "graf_backup*.tar.gz" | sort | tail -n 1)}"

test -z "$BACKUP_FILE_PATH" && echo "Error: No backup file found" >&2 && exit 1

BACKUP_FILE_PATH="$(readlink -f "$BACKUP_FILE_PATH")"
BACKUP_FILE_BASE=$(basename "$BACKUP_FILE_PATH")

docker run --rm \
    -v "${PROJECT_NAME}"_grafana-storage:/data \
    -v "$BACKUP_FILE_PATH":/backup/"$BACKUP_FILE_BASE" \
    alpine sh -c "tar xzf /backup/$BACKUP_FILE_BASE && rm -rf data_old"

(cd "$ROOT_PROJECT_PATH" && docker-compose restart grafana)
