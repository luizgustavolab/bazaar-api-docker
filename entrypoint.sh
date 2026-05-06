#!/bin/sh
set -e

echo "=============================="
echo "DATABASE_URL: $DATABASE_URL"
echo "NODE_ENV: $NODE_ENV"
echo "=============================="

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não definida"
  exit 1
fi

echo "🔄 Prisma Generate..."
npx prisma generate

echo "🚀 Starting Worker..."
node apps/worker/dist/index.js &

echo "🚀 Starting Crawler..."
node apps/crawler/dist/index.js &

echo "🚀 Starting API..."
exec node apps/api/dist/server.js