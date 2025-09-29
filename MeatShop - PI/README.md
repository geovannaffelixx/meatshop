
# MeatShop

## Como rodar

### Backend
cd meatshop-backend
npm install
npm run start:dev


### Frontend
cd meatshop-main
npm install
npm run dev

### Docker:
docker compose up --build
Acesse:

- Backend roda em: http://localhost:3001  
- Frontend roda em: http://localhost:3000

## Endpoints principais
- `POST /auth/register` — cadastra usuário (com todos os campos do açougue).  
- `POST /auth/login` — autentica por usuário **ou** e-mail + senha, retorna token fake.  
- `POST /auth/verify-code` — simula verificação de código (1234).  
- `POST /auth/reset-password` — simula redefinição de senha.
