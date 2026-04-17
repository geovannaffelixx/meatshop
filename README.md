# 🥩 MeatShop — Plataforma para Açougues & Clientes

![Build Status](https://img.shields.io/github/actions/workflow/status/geovannaffelixx/meatshop/ci.yml?label=CI%2FCD&logo=github)
![Último Commit](https://img.shields.io/github/last-commit/geovannaffelixx/meatshop)
![Linguagens](https://img.shields.io/github/languages/top/geovannaffelixx/meatshop)
![Tamanho](https://img.shields.io/github/repo-size/geovannaffelixx/meatshop)

![Backend NestJS](https://img.shields.io/badge/NestJS-Backend-red?logo=nestjs)
![Frontend NextJS](https://img.shields.io/badge/Next.js-Frontend-black?logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue?logo=postgresql)
![Docker Ready](https://img.shields.io/badge/Docker-ready-0db7ed?logo=docker)
![Versão](https://img.shields.io/badge/versão-1.0.0-green)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow?logo=open-source-initiative&logoColor=white)


---

# 📚 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura do Projeto](#-arquitetura-do-projeto)
3. [Como Rodar o Projeto](#-como-rodar-o-projeto)
4. [Configuração de Ambiente (.env)](#-configuração-de-ambiente-env)
5. [Domínios e Funcionalidades](#-domínios-e-funcionalidades)
6. [Banco de Dados & Migrations](#-banco-de-dados--migrations)
7. [Testes & Qualidade](#-testes--qualidade)
8. [CI/CD no GitHub Actions](#-cicd-no-github-actions)
9. [Estrutura de Pastas](#-estrutura-de-pastas)
10. [Monitoramento com Prometheus & Grafana](#-monitoramento-com-prometheus--grafana)
11. [Docs Extras](#-docs-extras)
12. [Roadmap / Próximos Passos](#-roadmap--próximos-passos)
13. [Licença](#-licença)

---

# 🌍 Visão Geral 

O **MeatShop** é uma plataforma completa para gestão de açougues e vendas online, integrando:

- Painel web (Next.js 15)
- API backend (NestJS + PostgreSQL)
- Observabilidade e monitoramento (Prometheus + Grafana)
- CI/CD via GitHub Actions
- Containerização completa com Docker Compose

Com ele, o vendedor controla **produtos, estoque, pedidos, vendas, despesas e dashboards**, enquanto o cliente pode visualizar e realizar compras.

---

# 🧱 Arquitetura do Projeto

### ✔ Backend (NestJS + PostgreSQL)

Local: `/meatshop-backend`

- NestJS (API REST)
- TypeORM + migrations
- PostgreSQL 17
- JWT + Refresh Token + Cookies HttpOnly
- Métricas via `prom-client`
- Logging estruturado
- Seeds de usuário/admin

### ✔ Frontend (Next.js 15 + App Router)

Local: `/meatshop-main`

- Next.js 15 (App Router)
- TailwindCSS
- Radix UI + ShadCN components
- Testes com Jest
- Comunicação via NEXT_PUBLIC_API_URL

### ✔ Infraestrutura

- Docker Compose (db + backend + frontend + prometheus + grafana)
- Prometheus: scrape `backend:3001/metrics`
- Grafana: dashboards prontos para métricas HTTP

---

# 🚀 Como Rodar o Projeto

## 1️⃣ Pré-Requisitos

- Node.js 20+
- Docker + Docker Compose
- PostgreSQL (se rodar local)

## 2️⃣ Clonar

```
git clone https://github.com/geovannaffelixx/meatshop
cd meatshop
```

## 3️⃣ Rodar com Docker (recomendado)

```
docker compose up --build
```

Acessos:

- Frontend → http://localhost:3000  
- Backend → http://localhost:3001  
- Métricas → http://localhost:3001/metrics  
- Prometheus → http://localhost:9090  
- Grafana → http://localhost:3002 (dependendo da configuração)

---

# ⚙ Configuração de Ambiente (.env)

## Backend (`.env.docker`)

```
DB_TYPE=postgres
DB_HOST=db
DB_PORT=5432
DB_USERNAME=meatshop_user
DB_PASSWORD=meatshop_pass
DB_DATABASE=meatshop
JWT_SECRET=troque_essa_chave
JWT_REFRESH_SECRET=troque_essa_outra
FRONTEND_URL=http://localhost:3000
```

## Frontend (`.env.docker`)

```
NEXT_PUBLIC_API_URL=http://backend:3001
NEXT_TELEMETRY_DISABLED=1
TZ=America/Sao_Paulo
```

---

# 🧩 Domínios e Funcionalidades

### ✔ Autenticação & Usuários
Cadastro, login, refresh token, recuperação de senha.

### ✔ Produtos & Estoque
CRUD completo, categorias, cortes, marca, quantidade.

### ✔ Pedidos & Vendas
Status, pagamento, desconto, total, valor pago, dashboard.

### ✔ Financeiro
Registro e consulta de despesas.

### ✔ Dashboard
KPIs de vendas, pedidos, conversão, métricas gerais.

### ✔ Métricas
Endpoint `/metrics` com:
- `http_request_duration_ms`
- `http_requests_total`
- Métricas padrão do Node.js

---

# 🗄 Banco de Dados & Migrations

Comandos:

```
npm run migration:run
npm run migration:revert
npm run migration:generate -- <name>
```

---

# 🧪 Testes & Qualidade

### Backend
- Jest + Supertest
- Cobertura salva em `/coverage`

### Frontend
- Jest + React Testing Library
- Lint: ESLint + Config Next

---

# 🔄 CI/CD – GitHub Actions

Pipeline incluído em:

```
.github/workflows/ci.yml
```

Inclui:

- Instalação de dependências
- Lint + typecheck
- Testes backend e frontend
- Build backend e frontend
- Subida do Docker
- Captura de métricas
- Upload de artifacts

---

# 🗂 Estrutura de Pastas

```
/meatshop
 ├─ /meatshop-backend
 ├─ /meatshop-main
 ├─ docker-compose.yml
 ├─ prometheus.yml
 ├─ .github/workflows/ci.yml
 └─ docs/
```

---

# 📊 Monitoramento

### ✔ Prometheus

Scrape:

```
backend:3001/metrics
```

### ✔ Grafana

Dashboards sugeridos:

- Latência por rota
- Erros 5xx / 4xx
- Requests por método
- Throughput

---

# 📄 Docs Extras

Em `/docs` → documentação formal em PDF.

---

# 🧭 Roadmap

- Rate limiting
- Modularização por domínios
- Testes E2E (Cypress)
- Alertas Prometheus
- Export de dashboards p/ grafana

---

# 📜 Licença

Uso acadêmico - MIT

---

