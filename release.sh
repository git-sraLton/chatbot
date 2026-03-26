#/bin/sh

#!/usr/bin/env bash
# release.sh — Create and push which triggers a pipeline for a new release
# Usage: ./release.sh <version>

set -euo pipefail

# --- Helper function for colored output ---
info()    { echo -e "\033[1;34m[INFO]\033[0m $*"; }
success() { echo -e "\033[1;32m[SUCCESS]\033[0m $*"; }
error()   { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

# --- Check arguments ---
if [ $# -ne 1 ]; then
  error "Usage: $0 <version>"
  exit 1
fi

VERSION="$1"
TAG="$VERSION"

# --- Check for uncommitted changes ---
if ! git diff --quiet || ! git diff --cached --quiet; then
  error "You have uncommitted changes. Commit or stash them before releasing."
  exit 1
fi

# --- Check if we are on the main branch ---
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  error "You must be on the 'main' or 'master' branch to create a release. Current branch: '$CURRENT_BRANCH'."
  exit 1
fi

# --- Ensure the tag does not already exist ---
if git rev-parse "$TAG" >/dev/null 2>&1; then
  error "Tag '$TAG' already exists."
  exit 1
fi

# --- Ensure the tag has valid version format (semantic versioning) ---
if ! [[ "$TAG" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
  error "Tag '$TAG' is not in valid semantic version format (e.g., 1.2.3 or 1.2.3-beta)."
  exit 1
fi

# --- Ensure the current branch is up to date ---
info "Fetching latest changes..."
git fetch origin

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
UPSTREAM="origin/$CURRENT_BRANCH"

if ! git diff --quiet "$UPSTREAM" "$CURRENT_BRANCH"; then
  error "Your branch '$CURRENT_BRANCH' is not up to date with '$UPSTREAM'."
  exit 1
fi

# --- Bump version in package.json ---
info "Bumping version to $VERSION in package.json..."
if ! command -v jq >/dev/null 2>&1; then
  error "jq is required to update package.json. Please install jq and try again."
  exit 1
fi
jq --arg ver "$VERSION" '.version = $ver' package.json > package.tmp.json && mv package.tmp.json package.json

# --- Push the new tag in the package.json to let the pipeline create a new release ---
git add package.json
git commit -m "chore: bump version to $VERSION"
git push origin "$CURRENT_BRANCH"

success "Version bumped to $VERSION and the pipeline should have been triggered for the new release."
