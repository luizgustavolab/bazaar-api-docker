## 🛡️⚙️ Bazaar API - Tibia Scout Backend (Monorepo)
Este é o motor central do ecossistema Tibia Scout. Um monorepo de alta performance responsável pelo web scraping, processamento de dados do Tibia Bazaar (CipSoft) e distribuição via API REST, agora otimizado para bancos de dados distribuídos.

Este projeto é o backend obrigatório para:
🔗 Tibia Scout Frontend: github.com/luizgustavolab/tibia-scout

## 🏗️ Arquitetura do Projeto

> - O projeto utiliza NPM Workspaces (Monorepo). Esta estrutura permite que todos os apps compartilhem uma camada lógica centralizada (lib), garantindo consistência de dados e tipagem:

apps/api: Servidor Fastify que entrega os dados processados.
apps/crawler: Motor de scraping (Vite-like/TypeScript) que extrai dados do site oficial.
apps/worker: Orquestrador BullMQ para persistência e limpeza de dados expirados.
shared (internal): Lógica centralizada de conexão com Prisma/Turso e Redis.

## 🛠️ Stack Tecnológica

    Runtime: Node.js (v20+) + TypeScript
    Framework Web: Fastify v4/v5
    ORM: Prisma v7 (Otimizado para Turso/libSQL)
    Banco de Dados: Turso (SQLite Distribuído) para persistência resiliente.
    Fila/Tasks: BullMQ + Redis (Suporte a Upstash e Local)
    Agendamento: Node-cron

## 🚀 Novas Implementações e Melhorias

Recentemente atualizado para maior escalabilidade:
  *Arquitetura Centralizada:* Agora as instâncias do Prisma e do Redis residem em uma lib compartilhada dentro de apps/api, evitando múltiplas conexões desnecessárias.
  *Migração para Turso:* Saída do SQLite local puro para o Turso (libSQL), permitindo que os dados persistam de forma independente do ciclo de vida do container.
  *Tipagem Estrita:* Implementação de Casting Seguro para as conexões do BullMQ, resolvendo conflitos de versão entre ioredis e as definições de tipo do worker.
  *Eficiência de Memória:* Configuração rigorosa de removeOnComplete e attempts no BullMQ para operar dentro dos limites do Upstash Free Tier e do Render Free.

## 🚀 Guia de Execução Local
📋 Pré-requisitos
Node.js v20+
Instância Redis (Local ou Upstash)
Token/URL do Turso (ou SQLite local para dev)

**🔧 Instalação**
  Clone e Instale:
    git clone https://github.com/luizgustavolab/bazaar-api-docker.git
    cd bazaar-api-docker
    npm install

  Configuração do Banco (Prisma v7):
    npx prisma generate
    npx prisma db push
   
  Variáveis de Ambiente (.env):
    Crie um `.env` na raiz:
    PORT=3333
    DATABASE_URL="libsql://seu-projeto.turso.io"
    DATABASE_AUTH_TOKEN="seu-token-aqui"
    REDIS_HOST=127.0.0.1
    REDIS_PORT=6379
  
  Execução em Desenvolvimento:
    npm run dev

## 📡 Endpoints Principais
  GET /health: Check de saúde da aplicação e integridade do Turso/Redis.
  GET /characters: Lista de personagens processados com filtros.
  GET /bazaar: Dados brutos do scraping e status do leilão.


## 📦 Conteinerização & Deploy (Foco no Render)
Diferente de arquiteturas tradicionais que exigem múltiplos serviços pagos separadamente, esta aplicação foi desenhada para rodar em um único container no plano gratuito do Render:

⚙️ Estratégia de Container Único
Para contornar as limitações de memória (512MB RAM), o projeto utiliza um entrypoint.sh que gerencia:
  Redis Interno: Instalado e executado dentro do próprio container para gerenciar as filas do BullMQ sem custos extras.
  Execução Nativa: Todos os apps são compilados para JavaScript puro (dist/) antes do deploy, reduzindo drasticamente o uso de CPU e RAM.
  Persistence: Otimizado para SQLite (local) ou Turso (cloud), garantindo que os dados sobrevivam aos restarts do container.

**🚀 Configuração para Deploy no Render**
  Runtime: Docker
  Plano: Free
  Variáveis de Ambiente:
  REDIS_PORT
  REDIS_HOST
  REDIS_PASSWORD
  TURSO_AUTH_TOKEN
  TURSO_DATABASE_URL

## 🔄 Padrão de Commits

- Utilizamos Conventional Commits para manter a governança:
  feat: Nova funcionalidade.
  fix: Correção de erro.
  docs: Alteração em documentação.
  chore: Atualização de pacotes ou build

## 👨‍💻 Autor e Licença

Desenvolvido por Luiz Gustavo 🔗 **[https://github.com/luizgustavolab](https://github.com/luizgustavolab)** .
Código aberto integrante do ecossistema Tibia Scout. Contribuições são bem-vindas respeitando os padrões de commits estabelecidos.
