#!/usr/bin/env bash
# Prepare a secrets-free Asset Intelligence export for transfer to
# neal3363/novara-asset-intelligence. Does not modify Tax OS branches.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/novara-asset-intelligence-export}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$OUT/$STAMP"

mkdir -p "$TARGET"

# Portable copy without rsync (excludes secrets, build artifacts, Tax OS).
tar -C "$ROOT" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.data' \
  --exclude='novara-tax-os' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='.env.development' \
  --exclude='.env*.local' \
  -cf - . | tar -C "$TARGET" -xf -

rm -f "$TARGET/.env" "$TARGET/.env.local" "$TARGET/.env.production" \
  "$TARGET/.env.development" || true
rm -rf "$TARGET/.data" "$TARGET/dist" || true
# shellcheck disable=SC2086
rm -f $TARGET/.env*.local 2>/dev/null || true

test -f "$TARGET/.env.example"

if find "$TARGET" -maxdepth 2 \( -name '.env' -o -name '.env.local' -o -name '.env.production' \) | grep -q .; then
  echo "Refusing export: secret env file present" >&2
  exit 1
fi

if grep -R -n -E 'getPreviewAuthPassword|process\.env\.PREVIEW_AUTH_PASSWORD' "$TARGET/src" 2>/dev/null; then
  echo "Refusing export: PREVIEW_AUTH_PASSWORD still referenced in src" >&2
  exit 1
fi

cat > "$TARGET/TRANSFER_README.md" <<'EOF'
# Transfer pack — NOVARA Asset Intelligence

This directory contains Asset Intelligence application files only.
It excludes `.git`, `node_modules`, `.next`, `.data`, and secret `.env*` files.
`.env.example` is included (no secret values).

## Human steps (repository creation is unavailable to the agent)

1. On GitHub, create an **empty** private repo: `neal3363/novara-asset-intelligence`
   - Do **not** rename `neal3363/novara-tax-solution`
   - Do **not** delete Tax OS branches on the shared repo
2. From this export directory:
   ```bash
   git init
   git add .
   git commit -m "Import NOVARA Asset Intelligence"
   git branch -M main
   git remote add origin https://github.com/neal3363/novara-asset-intelligence.git
   git push -u origin main
   ```
3. Point Cursor Cloud environment / publish settings at the new repository.
4. Configure the nine authentication variables from `.env.example` / `docs/AUTH_CONFIGURATION.md`.
5. Confirm removal of obsolete `PREVIEW_AUTH_PASSWORD` in Cursor Secrets if still listed.
6. Leave Tax OS history on `novara-tax-solution` untouched.

Live asset connectors remain disabled. Authentication configuration does not enable live asset data.
EOF

echo "Export ready: $TARGET"
echo "No secrets included. Tax OS paths excluded."
