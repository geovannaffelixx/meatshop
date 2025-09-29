# 💾 MeatShop Backend — NestJS + SQLite + TypeORM
- Endpoints: /health, /metrics, /auth/register, /auth/login, /auth/verify-code, /auth/reset-password, /users/me, /dashboard
- Banco: data/meatshop.db com SQLite
- Dockerfile (porta 3001)
- Utiliza Token Fake e banco local então não tem arquivo/configuração .env

------------------------------------------------------------------
# 💻 Tecnologias utilizadas:                                     
- **Back-end**: NestJS + SQLite + TypeORM                                 
- **Front-end**: Next.js 14 + Tailwind + ESLint 
- **Containerização**: Docker + Docker Compose
- **Testes**: Jest (back-end)
------------------------------------------------------------------

# 🚀 Como executar:

### <ins>Backend com npm install:</ins>
1. Rodar os comandos:
    - cd meatshop-backend
    - npm install
    - npm run start:dev
2. Acessar:
    - http://localhost:3001/health
    - http://localhost:3001/metrics

### <ins>Frontend:</ins>
1. Rodar os comandos:
      - cd meatshop-main
      - npm install
      - npm run dev
2. Acessar:
       - http://localhost:3000

### <ins>Backend e Frontend juntos com Docker:</ins>
1. Abrir o docker desktop.
2. Rodar no terminal o comando:
   - docker compose up --build
3. Acessar:
   - http://localhost:3000
4. Backend e Frontend já vão estar integrados e funcionando em conjunto, permitindo o cadastro, login e etc.
------------------------------------------------------------------

- **Backend roda em: http://localhost:3001**
- **Frontend roda em: http://localhost:3000**

# Endpoints:
- `POST /auth/register` — cadastra usuário (com todos os campos do açougue).  
- `POST /auth/login` — autentica por usuário **ou** e-mail + senha, retorna token fake.  
- `POST /auth/verify-code` — simula verificação de código (1234).  
- `POST /auth/reset-password` — simula redefinição de senha.
------------------------------------------------------------------
