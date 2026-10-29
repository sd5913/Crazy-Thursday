#!/usr/bin/env bash
set -euo pipefail

test -s downloaded/web/index.html
mapfile -t apks < <(find downloaded/android -type f -name '*.apk')
if [[ ${#apks[@]} -ne 1 ]]; then
  echo 'Expected exactly one Android debug APK' >&2
  exit 1
fi
mkdir -p release
(cd downloaded/web && zip -qr ../../release/web.zip .)
cp "${apks[0]}" release/android-debug.apk
test -s release/web.zip
test -s release/android-debug.apk
