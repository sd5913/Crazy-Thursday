#!/bin/bash
cd -- "$(dirname -- "$0")/.." || exit 1
# Finder does not always inherit the terminal's Node installation path.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js is missing. Install Node 24 LTS from https://nodejs.org, then try again.\n'
  read -r -p 'Press Enter to close...'
  exit 1
fi
if ! node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)'; then
  printf 'Node.js 22 or later is required. Node 24 LTS is recommended.\n'
  read -r -p 'Press Enter to close...'
  exit 1
fi
# The web preview uses only built-in Node modules; npm install is not needed.
node scripts/start.mjs
status=$?
if [ "$status" -ne 0 ]; then
  read -r -p 'Startup failed. Press Enter to close...'
fi
exit "$status"
