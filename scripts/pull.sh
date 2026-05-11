#!/bin/bash
echo "🔄 Syncing with GitHub..."
git pull origin main --rebase
if [ $? -ne 0 ]; then
  echo "❌ Pull failed. Resolve conflicts first."
  exit 1
fi
echo "✅ Up to date."
