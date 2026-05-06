#!/bin/sh

# 1. Aguarda um momento para garantir que as variáveis do Render foram injetadas
echo "⏳ Aguardando inicialização do ambiente..."
sleep 2

# 2. Sincroniza o schema com o Turso
# O '--schema' explícito ajuda o Prisma a não se perder em monorepos
echo "🔄 Sincronizando banco Turso via Prisma..."
if [ -z "$TURSO_DATABASE_URL" ]; then
    echo "❌ ERRO: TURSO_DATABASE_URL não encontrada no ambiente!"
    exit 1
fi

npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss

# 3. Inicia os processos de background
# IMPORTANTE: Redirecionamos o log para o stdout para você ver tudo no Render
echo "🚀 Iniciando Worker de Background..."
node apps/worker/dist/index.js > /dev/stdout 2>&1 &

echo "🕵️ Iniciando Crawler (Agendamento Diário)..."
node apps/crawler/dist/index.js > /dev/stdout 2>&1 &

# 4. Inicia a API como processo principal (PID 1)
# O 'exec' faz com que a API receba sinais de desligamento do Render corretamente
echo "📡 API Online na porta 3333..."
exec node apps/api/dist/server.js