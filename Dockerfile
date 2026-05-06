# Usamos a versão 20-slim por ser leve e estável
FROM node:20-slim

# Instalar openssl (motor do Prisma) e ca-certificates (necessário para o Turso/HTTPS)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copiar definições de dependências (Otimização de Cache)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/crawler/package*.json ./apps/crawler/
COPY apps/worker/package*.json ./apps/worker/

# 2. Instalação das dependências
RUN npm install

# 3. Gerar o Prisma Client
# Importante: Copiamos o schema antes de rodar o generate
COPY prisma ./prisma/
RUN npx prisma generate

# 4. Copiar o restante do código e fazer o Build
COPY . .
RUN npm run build

# 5. Permissões e Execução
# Garantimos que o script de entrada use o formato de linha Unix
RUN chmod +x ./entrypoint.sh

EXPOSE 3333

# O entrypoint cuidará do 'prisma db push' e de subir os 3 processos
CMD ["./entrypoint.sh"]