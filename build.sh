#!/usr/bin/env bash
# Generates rooms.js from markdown files in this repo.
# Run: bash build.sh

set -euo pipefail
cd "$(dirname "$0")"

echo "const ROOMS = [" > rooms.js

first=true
for file in *.md; do
  # Skip overview file
  case "$file" in *Oversikt*) continue ;; esac

  name="${file%.md}"

  # Slug: lowercase, spaces to hyphens, Norwegian chars transliterated
  slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g; s/ø/o/g; s/æ/ae/g; s/å/a/g')

  # Last modified from git (fallback to file mtime)
  last_modified=$(git log -1 --format=%aI -- "$file" 2>/dev/null || true)
  if [ -z "$last_modified" ]; then
    last_modified=$(date -Iseconds -r "$file" 2>/dev/null || date -r "$file" "+%Y-%m-%dT%H:%M:%S%z" 2>/dev/null || echo "")
  fi

  # JSON-escape the markdown content
  json_content=$(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" < "$file")

  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> rooms.js
  fi

  # Write room object (json_content already includes quotes)
  printf '  {"name":%s,"slug":%s,"lastModified":%s,"markdown":%s}' \
    "$(python3 -c "import json; print(json.dumps('$name'))")" \
    "$(echo "$slug" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))")" \
    "$(echo "$last_modified" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))")" \
    "$json_content" >> rooms.js
done

echo "" >> rooms.js
echo "];" >> rooms.js

echo "rooms.js generated with $(grep -c '"slug"' rooms.js) rooms."
