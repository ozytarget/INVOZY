#!/bin/bash

# Deploy script: runs quality checks, then commits and pushes to GitHub.
# Usage: ./deploy.sh "commit message"

set -euo pipefail

if [ $# -lt 1 ] || [ -z "${1}" ]; then
    echo "Error: a commit message is required."
    echo "Usage: ./deploy.sh \"commit message\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "Step 1/4: Checking that no env files are tracked by git..."
if git ls-files --error-unmatch .env > /dev/null 2>&1 || git ls-files --error-unmatch .env.local > /dev/null 2>&1; then
    echo "Error: .env or .env.local is tracked by git. Aborting to avoid leaking secrets."
    echo "Untrack them first with: git rm --cached .env .env.local"
    exit 1
fi
echo "OK: no env files are tracked."
echo "----------------------------------------------------"
echo ""

echo "Step 2/4: Running quality checks (typecheck, lint, build)..."
npm run typecheck
npm run lint
npm run build
echo "All checks passed."
echo "----------------------------------------------------"
echo ""

echo "Step 3/4: Staging and committing changes..."
git add -A

# Abort if any env file would end up in the commit.
if git diff --cached --name-only | grep -E '^\.env(\.local)?$' > /dev/null; then
    git restore --staged .env .env.local 2> /dev/null || true
    echo "Error: .env or .env.local was staged for commit. Aborting to avoid leaking secrets."
    exit 1
fi

git status --short

if git diff --cached --quiet; then
    echo "No changes to commit. Skipping commit."
else
    git commit -m "$COMMIT_MESSAGE"
    echo "Changes committed."
fi
echo "----------------------------------------------------"
echo ""

echo "Step 4/4: Pushing to GitHub..."
git push origin main

echo ""
echo "----------------------------------------------------"
echo "Done! Your project has been pushed to GitHub."
