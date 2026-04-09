#!/usr/bin/env bash
# Cron job to generate a new startup idea every 6 hours.
# Add to crontab: 0 */6 * * * /path/to/pitch-arena/scripts/cron-generate.sh
#
# Or run manually: ./scripts/cron-generate.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/data/generation.log"

cd "$PROJECT_DIR"

echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — Starting idea generation" >> "$LOG_FILE"

if npx tsx src/scripts/generate-idea.ts >> "$LOG_FILE" 2>&1; then
  echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — Generation complete" >> "$LOG_FILE"
else
  echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — Generation FAILED" >> "$LOG_FILE"
fi

echo "---" >> "$LOG_FILE"
