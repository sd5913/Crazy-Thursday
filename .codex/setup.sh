#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Keep npm's cache writable in restricted cloud workspaces.
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-/workspace/.npm-cache}"
npm ci
npm test
npm run android:sync
