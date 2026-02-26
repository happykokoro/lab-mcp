#!/usr/bin/env bash
# Sync generated TypeScript types from the frontend to lab-mcp.
# Run from lab-mcp root: bash scripts/sync-types.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_TYPES="${PROJECT_ROOT}/../auto-rebalance-project/frontend/app/lib/generated-types.ts"
TARGET="${PROJECT_ROOT}/src/types/generated.ts"

if [ ! -f "$FRONTEND_TYPES" ]; then
  echo "Error: Frontend types not found at $FRONTEND_TYPES"
  echo "Run 'cd ../auto-rebalance-project && ./scripts/generate-types.sh' first."
  exit 1
fi

cp "$FRONTEND_TYPES" "$TARGET"
echo "Synced $(wc -l < "$TARGET") lines → $TARGET"
