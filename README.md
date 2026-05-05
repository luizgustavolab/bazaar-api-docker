## 🛡️⚙️ Bazaar API - Tibia Scout Backend - DOCKER

Este é o motor central do ecossistema Tibia Scout. Ele é responsável pelo web scraping de alta performance, processamento de dados do Tibia Bazaar (CipSoft) e distribuição desses dados via API REST.

Este projeto atua como o Backend obrigatório para o funcionamento das funcionalidades de mercado do projeto:
🔗 Tibia Scout Frontend [https://github.com/luizgustavolab/tibia-scout.git](https://github.com/luizgustavolab/tibia-scout.git)

## 🏗️ Arquitetura do Projeto

> - O projeto utiliza o conceito de NPM Workspaces (Monorepo). Essa estrutura permite que a API e os serviços de coleta compartilhem tipos e lógica de banco de dados, mantendo a separação de responsabilidades:

    apps/api: Servidor Fastify que entrega os dados processados ao Frontend.
    apps/crawler: Motor de scraping que extrai dados brutos do site oficial do Tibia.
    apps/worker: Orquestrador de tarefas que gerencia a persistência e atualização do banco de dados.

## 🛠️ Stack Tecnológica

    untime: Node.js (v20+) + TypeScript
    Framework Web: Fastify v4
    ORM: Prisma (v5+)
    Banco de Dados: SQLite (Foco em portabilidade e persistência em container)
    Fila/Tasks: BullMQ + Redis (Interno ao container)
    Agendamento: Node-cron

## Conteinerização & Deploy (Foco no Render)

> Diferente de arquiteturas tradicionais que exigem múltiplos serviços pagos separadamente, esta aplicação foi desenhada para rodar em um único container no plano gratuito do Render:

**⚙️ Estratégia de Container Único**
Para contornar as limitações de memória (512MB RAM), o projeto utiliza um entrypoint.sh que gerencia:
Redis Interno: Instalado e executado dentro do próprio container para gerenciar as filas do BullMQ sem custos extras.
Execução Nativa: Todos os apps são compilados para JavaScript puro (dist/) antes do deploy, reduzindo drasticamente o uso de CPU e RAM em comparação ao ts-node.
Persistence (SQLite): O banco de dados reside no sistema de arquivos do container.

**🚀 Configuração para Deploy no Render**
Ao conectar este repositório ao Render, utilize:
Runtime: Docker
Plano: Free
Variáveis de Ambiente:
PORT: 3333
DATABASE_URL: file:/app/prisma/dev.db
REDIS_HOST: 127.0.0.1 (O Redis estará rodando localmente no container)

## 🚀 Guia do Programador: Como Rodar Localmente

📋 Pré-requisitos

- Node.js v20+ e NPM.
- Docker instalado (opcional, para testes de container).
- Redis instalado (caso não use Docker localmente).

## 🔧 Instalação Passo a Passo

1. **Clone o repositório:**
   git clone [https://github.com/luizgustavolab/bazaar-api-docker.git](https://github.com/luizgustavolab/bazaar-api-docker.git)
   cd bazaar-api-docker

2. **Instale as dependências (Raiz do Monorepo):**
   npm install

3. **Configuração do Banco de Dados:**

- Gere o cliente do Prisma e sincronize o esquema com o seu arquivo SQLite local:
  npx prisma generate
  npx prisma db push

4.  **🔐 Variáveis de Ambiente (.env)**
    O projeto utiliza variáveis de ambiente para gerenciar conexões e portas.
    Crie um arquivo .env na raiz do projeto com:
        - PORT - Porta onde a API será exposta = 3333
        - DATABASE_URL - Caminho do banco SQLite = file:./prisma/dev.db
        - REDIS_HOST - Host do servidor Redis = 127.0.0.1
        - REDIS_PORT - Porta do servidor Redis = 6379

No ambiente Render (Docker), o REDIS_HOST deve ser obrigatoriamente 127.0.0.1, pois o serviço Redis é inicializado internamente no mesmo container pelo entrypoint.sh.

5. **🏃 Execução**

- Para rodar em modo de desenvolvimento com Hot Reload em todos os serviços simultaneamente:
  npm run dev

- Como rodar localmente (Docker)
  Certifique-se de ter as variáveis de ambiente no .env.
  Execute o comando:
  docker build -t bazaar-api-docker
  docker run -p 3333:3333 bazaar-api-docker

## 📡 Endpoints Principais

- GET /health: Check de saúde da aplicação e conexão com banco.
- GET /characters: Retorna a lista de personagens processados do Bazaar.
- GET /bazaar: Retorna dados ativos e filtros do leilão.

## 🏗️ Decisões Técnicas e Desafios

- **Migração de Infraestrutura:** Saída do Railway para Docker/Render visando maior controle sobre os processos de background (Worker/Crawler).
- **Otimização de Memória:** Substituição da execução via ts-node por código compilado no ambiente de produção.
- **Resiliência no Boot:** O Crawler é acionado imediatamente ao subir o container para garantir que o banco SQLite seja povoado no primeiro deploy.

## 🔄 Padrão de Commits

- Utilizamos Conventional Commits para manter a governança:
  feat: Nova funcionalidade.
  fix: Correção de erro.
  docs: Alteração em documentação.
  chore: Atualização de pacotes ou build

## 👨‍💻 Autor e Licença

Desenvolvido por Luiz Gustavo 🔗 **[https://github.com/luizgustavolab](https://github.com/luizgustavolab)** .
Código aberto integrante do ecossistema Tibia Scout. Contribuições são bem-vindas respeitando os padrões de commits estabelecidos.
