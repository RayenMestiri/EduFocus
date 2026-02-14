#!/usr/bin/env bash
# Script: scripts/daily-commit.sh
# Usage: Run from cron or a CI runner. Adjust AUTHOR_NAME and AUTHOR_EMAIL as needed.

set -euo pipefail
cd "$(dirname "$0")/.."

TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%SZ")
echo "Updated: ${TIMESTAMP}" > .github/daily-heartbeat.txt

git add .github/daily-heartbeat.txt
if git commit -m "chore: local daily heartbeat" --author="Your Name <you@example.com>"; then
  git push origin "$(git rev-parse --abbrev-ref HEAD)"
else
  echo "No changes to commit"
fi
