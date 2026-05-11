#!/bin/bash
MSG=${1:-"update: $(date '+%Y-%m-%d %H:%M')"}
npm run build --silent
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Fix errors before saving."
  exit 1
fi
git add -A
git commit -m "$MSG"
git push origin main
echo "✅ Saved and pushed: $MSG"
