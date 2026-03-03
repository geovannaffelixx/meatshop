# 🥩 MeatShop — Backend (NestJS + PostgreSQL + Docker + Observabilidade)

![Build Status](https://img.shields.io/github/actions/workflow/status/geovannaffelixx/meatshop/ci.yml?label=CI%2FCD&logo=github)
![Último Commit](https://img.shields.io/github/last-commit/geovannaffelixx/meatshop)
![Linguagem](https://img.shields.io/github/languages/top/geovannaffelixx/meatshop)
![Tamanho](https://img.shields.io/github/repo-size/geovannaffelixx/meatshop)

![NestJS](https://img.shields.io/badge/NestJS-Backend-red?logo=nestjs)
![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL-17-blue?logo=postgresql)
![Docker Ready](https://img.shields.io/badge/Docker-ready-0db7ed?logo=docker)
![JWT Auth](https://img.shields.io/badge/Auth-JWT%20%2B%20Refresh-green)

---

# 📌 SOBRE O PROJETO

Este é o **backend oficial do MeatShop**, desenvolvido em **NestJS + PostgreSQL**, projetado para ser:

- 🔐 **Seguro** (JWT + Refresh + Cookies HttpOnly)
- 🧱 **Escalável** e modularizado
- 📊 **Monitorado** via Prometheus + Grafana
- 🧪 **Testado** com Jest
- 🐳 **Containerizado** com Docker

---

# 📚 ÍNDICE

1. Arquitetura  
2. Estrutura de Pastas  
3. Instalação (Local e Docker)  
4. Ambiente (.env)  
5. Segurança  
6. Entidades + ERD (Banco de Dados)  
7. Mapa de Rotas  
8. Módulos do Sistema  
9. Métricas e Observabilidade  
10. Logs e Filtros de Exceção  
11. Testes (unitários e E2E)  
12. Pipeline CI/CD  
13. Expansões Futuras (Snyk, SonarQube, CodeQL)  
14. Padrões de Commit  
15. Roadmap  
16. Licença  

---

# 🧱 1. ARQUITETURA

A arquitetura segue o padrão **modular do NestJS** com toques de Clean Architecture:

```
src/
├── auth/ → Login, tokens, recuperação de senha
├── common/ → Middlewares, interceptors, guards, filters
├── config/ → Configurações de banco, env
├── dashboard/ → KPIs consolidados (vendas, pedidos, despesas)
├── entities/ → Entidades TypeORM + relacionamentos
├── finance/ → Módulo de despesas
├── metrics/ → Prometheus (http metrics)
├── orders/ → Pedidos
├── products/ → Produtos
├── sales/ → Vendas e descontos
├── seed/ → Criar usuário/admin automático
└── main.ts → Bootstrap da aplicação
```

---

# 🗂 2. ESTRUTURA DE PASTAS (DETALHADA)

```
meatshop-backend/
├── src/
│ ├── auth/
│ ├── common/logger/
│ ├── common/filters/
│ ├── common/middlewares/
│ ├── config/
│ ├── dashboard/
│ ├── entities/
│ ├── finance/
│ ├── metrics/
│ ├── orders/
│ ├── products/
│ ├── sales/
│ ├── seed/
│ └── app.module.ts
├── test/
├── logs/
├── Dockerfile
├── tsconfig.json
├── package.json
└── .env.example
```

---

# 🐳 3. COMO RODAR O BACKEND

## 🔹 3.1 Rodando com Docker (RECOMENDADO)

📌 Na raiz do projeto:

```bash
docker compose up --build
```

### Serviços:

| Serviço | URL |
|--------|-----|
| Backend (NestJS) | http://localhost:3001 |
| Healthcheck | http://localhost:3001/health |
| Métricas Prometheus | http://localhost:3001/metrics |
| PostgreSQL | localhost:5432 |

---

## 🔹 3.2 Rodando localmente (Node.js)

```bash
npm install
cp .env.example .env
npm run migration:run
npm run start:dev
```

---

# 🔧 4. VARIÁVEIS DE AMBIENTE (.env)

```
PORT=3001

DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=meatshop_user
DB_PASSWORD=meatshop_pass
DB_DATABASE=meatshop

JWT_SECRET=coloque_uma_chave_forte
JWT_REFRESH_SECRET=coloque_outra_chave
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

FRONTEND_URL=http://localhost:3000
COOKIE_SECURE=false
```

---

# 🔐 5. SEGURANÇA IMPLEMENTADA

- JWT Access Token  
- JWT Refresh Token  
- Cookies HttpOnly  
- SameSite Strict  
- Hash de senha com bcrypt  
- DTO validation + Pipes global  
- Guards e Interceptors  
- Seeds com usuário admin seguro  

---

# 🗄 6. ENTIDADES + ERD (BANCO DE DADOS)

### ✔ Entidades Principais:

- User  
- Product  
- Order  
- Sale  
- Expense  
- RefreshToken  

### ✔ Diagrama (ERD):

```
User ───< Orders >───< Sales
         │
         ├──< Expenses
         └──< RefreshTokens

Product ───< Sales
```

---

# 🌐 7. MAPA DE ROTAS COMPLETO

### 📌 AUTH
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /auth/register | criar usuário |
| POST | /auth/login | login |
| POST | /auth/refresh | renovar token |
| POST | /auth/reset-password | redefinir senha |

### 📌 PRODUCTS
| Método | Rota |
|--------|------|
| GET | /products |
| POST | /products |
| PUT | /products/:id |

### 📌 ORDERS
| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/orders` | Lista todos os pedidos (com filtros opcionais) |
| GET    | `/orders/:id` | Retorna os detalhes de um pedido |
| POST   | `/orders` | Cria um novo pedido |
| PUT    | `/orders/:id` | Atualiza os dados de um pedido |
| DELETE | `/orders/:id` | Remove um pedido (se permitido) |
| PATCH  | `/orders/:id/status` | Atualiza somente o status do pedido |
| GET    | `/orders/dashboard/metrics` | Métricas gerais de pedidos |

### 📌 SALES (Vendas e Descontos)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/sales` | Lista todas as vendas |
| GET    | `/sales/:id` | Detalhes de uma venda específica |
| POST   | `/sales` | Registra uma nova venda |
| GET    | `/sales/discounts` | Lista todos os descontos aplicados |
| POST   | `/sales/discounts` | Cria ou associa um desconto |
| GET    | `/sales/metrics` | Métricas consolidadas de vendas |

### 📌 FINANCE (Financeiro & Despesas)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/finance/expenses` | Lista todas as despesas |
| GET    | `/finance/expenses/:id` | Detalhes de uma despesa |
| POST   | `/finance/expenses` | Cadastra uma nova despesa |
| PUT    | `/finance/expenses/:id` | Atualiza uma despesa existente |
| DELETE | `/finance/expenses/:id` | Remove uma despesa |
| GET    | `/finance/summary` | Resumo financeiro: vendas, despesas, lucros, margem |
| GET    | `/finance/monthly` | Consolidado mensal |
| GET    | `/finance/daily` | Consolidado diário |

### 📌 DASHBOARD (KPIs)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/dashboard` | Retorna KPIs gerais: vendas, pedidos, despesas, lucro |
| GET    | `/dashboard/goals` | Retorna metas e indicadores |
| GET    | `/dashboard/trends` | Tendências e evolução de métricas |


---

# 📦 8. MÓDULOS DO SISTEMA

- AuthModule  
- OrdersModule  
- SalesModule  
- ProductsModule  
- FinanceModule  
- DashboardModule  
- MetricsModule  
- LoggerModule  

---

# 📊 9. MÉTRICAS E OBSERVABILIDADE

### ✔ Endpoint Prometheus
```
GET /metrics
```

### ✔ Métricas expostas:
- http_requests_total  
- http_request_duration_ms  
- nodejs_eventloop_lag  
- memory_usage  
- CPU usage  

---

# 📜 10. LOGS

Padrão:

```
logs/
 ├── access.log
 ├── error.log
 ├── app.log
```

Middleware captura:

- IP  
- Método  
- Rota  
- Status  
- Tempo de resposta  

---

# 🧪 11. TESTES

Testes unitários:

```bash
npm run test
```

Testes com coverage:

```bash
npm run test:cov
```

Pasta:

```
coverage/
```

---

# 🔄 12. CI/CD (GitHub Actions)

O pipeline realiza:

- ✔ Instala dependências  
- ✔ Lint  
- ✔ Typecheck  
- ✔ Testes + Coverage  
- ✔ Migrations  
- ✔ Build  
- ✔ Docker Compose (ambiente de integração)  
- ✔ Exporta artefatos  

---

# 🛡 13. ADIÇÕES FUTURAS (Snyk, SonarQube, CodeQL)

## ✔ Snyk
```
- uses: snyk/actions/node
```

## ✔ SonarQube
Requer `sonar-project.properties`

## ✔ CodeQL
```
.github/workflows/codeql.yml
```

---

# 💬 14. PADRÕES DE COMMIT

Usar **Conventional Commits**.

---

# 🧭 15. ROADMAP

- [ ] Adicionar Snyk no CI  
- [ ] Adicionar CodeQL  
- [ ] Integrar SonarQube  
- [ ] Testes E2E completos  
- [ ] Alertas no Prometheus  
- [ ] Rate-limit global  
- [ ] Auditoria de logs  

---

# 📜 16. LICENÇA

Licença MIT — uso livre para fins acadêmicos e profissionais.
