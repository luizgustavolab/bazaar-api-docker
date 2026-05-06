# Usamos a versão 20-slim por ser leve e estável
FROM node:20-slim

# Instalar openssl (motor do Prisma) e ca-certificates (necessário para o Turso/HTTPS)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Definir ambiente como produção
ENV NODE_ENV=production

WORKDIR /app

# 1. Copiar definições de dependências
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/crawler/package*.json ./apps/crawler/
COPY apps/worker/package*.json ./apps/worker/

# 2. Instalação das dependências (omitindo devDependencies se preferir, 
# mas para o build do TS precisamos delas, então mantemos npm install)
RUN npm install

# 3. Gerar o Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

# 4. Copiar o restante do código e fazer o Build
COPY . .
RUN npm run build

# 5. Configuração do Entrypoint
# Forçamos a cópia individual para garantir que o script esteja na raiz do WORKDIR
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3333

# O entrypoint cuidará do 'prisma db push' e de subir os 3 processos
ENTRYPOINT ["./entrypoint.sh"]