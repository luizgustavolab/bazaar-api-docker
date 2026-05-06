#!/bin/sh
set -e # Interrompe o script se qualquer comando falhar

echo "🔄 [STEP 1] Sincronizando Schema com Turso..."
# O --accept-data-loss é necessário para o push inicial em bancos vazios
npx prisma db push --accept-data-loss

echo "🚀 [STEP 2] Iniciando Serviços de Background..."
# Rodar com o 'node' diretamente garante que o caminho do dist está correto
node apps/worker/dist/index.js &
node apps/crawler/dist/index.js &

echo "📡 [STEP 3] Iniciando API principal..."
# O 'exec' faz com que a API assuma o PID 1 e receba os sinais do Render
exec node apps/api/dist/server.js