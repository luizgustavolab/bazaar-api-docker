FROM node:20-slim

RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copiar definições
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/crawler/package*.json ./apps/crawler/
COPY apps/worker/package*.json ./apps/worker/

# 2. Instalação (Instalamos TUDO para garantir que o build funcione)
RUN npm install

# 3. Prisma
COPY prisma ./prisma/
RUN npx prisma generate

# 4. Copiar código e Build
COPY . .
# Forçamos o uso do npx no build para garantir que o tsc seja encontrado
RUN npm run build

# 5. Só agora definimos como produção para a execução
ENV NODE_ENV=production

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3333

ENTRYPOINT ["./entrypoint.sh"]