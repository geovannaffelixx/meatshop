## MeatShop Backend — NestJS + SQLite + TypeORM
- Endpoints: /health, /metrics, /auth/register, /auth/login, /auth/verify-code, /auth/reset-password, /users/me, /dashboard
- Banco: data/meatshop.db com SQLite
- Dockerfile (porta 3001)
- Utiliza Token Fake e banco local então não tem arquivo/configuração .env

------------------------------------------------------------------
## 🚀 Tecnologias utilizadas:                                     
- **Back-end**: NestJS + SQLite                                  
- **Front-end**: Next.js 14 + Tailwind
- **Containerização**: Docker + Docker Compose
- **Testes**: Jest (back-end)
------------------------------------------------------------------

## Como rodar

### Backend com npm install
1. Rodar os comandos:
  - cd meatshop-backend
  - npm install
  - npm run start:dev

### Frontend
1. Rodar os comandos:
  - cd meatshop-main
  - npm install
  - npm run dev

### Backend e Frontend juntos com Docker:
1. Abrir o docker desktop.
2. Rodar no terminal o comando:
   - docker compose up --build
3. Acessar:
   - http://localhost:3000
4. Backend e Frontend já vão estar integrados e funcionando em conjunto, permitindo o cadastro, login e etc.
------------------------------------------------------------------

- Backend roda em: http://localhost:3001  
- Frontend roda em: http://localhost:3000

## Endpoints principais
- `POST /auth/register` — cadastra usuário (com todos os campos do açougue).  
- `POST /auth/login` — autentica por usuário **ou** e-mail + senha, retorna token fake.  
- `POST /auth/verify-code` — simula verificação de código (1234).  
- `POST /auth/reset-password` — simula redefinição de senha.
------------------------------------------------------------------
