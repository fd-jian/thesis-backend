#!/bin/sh

# Backup named volume of grafana container. Backup will be stored in
# $ROOT_PROJECT_DIR/grafana/backup. PWD is used for ROOT_PROJECT_DIR if called
# without arguments.
# 
# Usage: grafana_backup [ROOT_PROJECT_DIR]

SCRIPT_DIR="${1:-.}"
ROOT_PROJECT_DIR=$(readlink -f "$SCRIPT_DIR")
PROJECT_NAME=$(basename "$ROOT_PROJECT_DIR")

docker run --rm \
    -v "${PROJECT_NAME}"_grafana-storage:/data \
    -v "$ROOT_PROJECT_DIR"/grafana/backup:/backup \
    alpine tar czf /backup/graf_backup_"$(date '+%Y%m%d%H%M%S')".tar.gz data
