#!/usr/bin/env bash
# Exit on error
set -e

# Find out if package.json or pnpm-workspace.yaml are staged
STAGED_FILES=$(git diff --cached --name-only)

needs_lockfile_check=false
for file in $STAGED_FILES; do
  if [[ "$file" == "package.json" || "$file" == "pnpm-workspace.yaml" ]]; then
    needs_lockfile_check=true
  fi
done

if [ "$needs_lockfile_check" = true ]; then
  echo "⚠️  [Pre-commit] Detected changes in package.json or pnpm-workspace.yaml."
  echo "🔍 Checking if pnpm-lock.yaml is in sync..."
  
  # Run pnpm install with --frozen-lockfile to check if it's in sync
  if ! pnpm install --frozen-lockfile --prefer-offline --reporter=silent; then
    echo "❌ ERROR: pnpm-lock.yaml is out of sync with your package.json / pnpm-workspace.yaml configurations!"
    echo "💡 Please run 'pnpm install' locally to regenerate pnpm-lock.yaml, stage the updated lockfile, and try committing again."
    exit 1
  fi
  echo "✅ pnpm-lock.yaml is perfectly in sync!"
fi
