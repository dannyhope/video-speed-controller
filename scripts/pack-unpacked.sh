#!/usr/bin/env bash
# Copy only the Chrome-loadable files into dist/.
# Chrome refuses folders whose names start with "_" (_docs), so Load unpacked
# must not point at the repo root.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dest="$root/dist"

rm -rf "$dest"
mkdir -p "$dest/icons"

cp "$root/manifest.json" \
  "$root/background.js" \
  "$root/content.js" \
  "$root/constants.js" \
  "$root/youtube-embed.js" \
  "$root/popup.html" \
  "$root/popup.js" \
  "$root/popup.css" \
  "$root/styles.css" \
  "$dest/"

cp "$root/icons/icon-16.png" \
  "$root/icons/icon-48.png" \
  "$root/icons/icon-128.png" \
  "$dest/icons/"

echo "Load unpacked from: $dest"
