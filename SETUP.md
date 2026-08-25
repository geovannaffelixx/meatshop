# Setup local — MeatShop

Guia único e verificado pra rodar o projeto inteiro (banco + backend + frontend) do zero, em qualquer máquina, depois de clonar o repositório. Segue exatamente na ordem — cada passo depende do anterior.

Fluxo usado aqui: **banco no Docker, backend e frontend rodando localmente com `npm run dev`** (hot reload nos dois). É o jeito mais rápido pra desenvolver e testar. Rodar tudo dentro do Docker (`docker compose up --build`, incluindo backend/frontend/prometheus/grafana) também funciona pra simular produção, mas não é o fluxo do dia a dia — não é o que este guia cobre.

## 0. Pré-requisitos

- **Node.js 20 ou superior** (testado com 22.x) — `node --version`
- **Docker Desktop** instalado e aberto (o daemon precisa estar rodando antes do passo 3) — `docker --version`
- **npm** (vem com o Node) — `npm --version`

## 1. Clonar e instalar dependências

```powershell
git clone <url-do-repositorio>
cd meatshop

cd meatshop-backend
npm install

cd ../meatshop-main
npm install

cd ..
```

## 2. Configurar variáveis de ambiente

Nenhum `.env` vai pro git (proposital — são segredos). Você precisa criar 3 arquivos locais.

### 2.1 `meatshop-backend/.env`

Copie `meatshop-backend/.env.example` para `meatshop-backend/.env` e preencha:

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=meatshop_user
DB_PASSWORD=meatshop_pass
DB_DATABASE=meatshop
DB_SYNCHRONIZE=false
DB_SSL=false

JWT_SECRET=<gerar — comando abaixo>
JWT_REFRESH_SECRET=<gerar — comando abaixo>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

FRONTEND_URL=http://localhost:3000
COOKIE_SECURE=false
COOKIE_SAMESITE=strict

PORT=3001
NODE_ENV=development
TZ=America/Sao_Paulo
```

Gere os dois segredos JWT (rode duas vezes, um valor pra cada variável — **nunca reaproveite o mesmo valor entre `JWT_SECRET` e `JWT_REFRESH_SECRET`**, e nunca reaproveite segredo de uma máquina/ambiente em outro):

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

O resto do `.env.example` (Mailtrap, Mercado Pago, Firebase) pode ficar em branco pra rodar localmente — cada um deles falha de forma segura e isolada quando vazio:
- Sem `MAIL_*`: envio de e-mail (verificação, reset de senha) falha silenciosamente, logado como erro — não trava o cadastro/login.
- Sem `MP_WEBHOOK_SECRET`: o webhook de pagamento do Mercado Pago rejeita notificações (fail-closed) — só importa se for testar pagamento de verdade.
- Sem `FIREBASE_SERVICE_ACCOUNT`: push notification fica indisponível (503), resto do módulo de notificações funciona.

### 2.2 `meatshop-backend/.env.local-migrations`

Usado só pelos comandos `npm run migration:run` / `migration:generate`. Mesmas credenciais de banco do `.env`, sem os campos de app:

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=meatshop_user
DB_PASSWORD=meatshop_pass
DB_DATABASE=meatshop
DB_SSL=false
```

### 2.3 `meatshop-main/.env`

Copie `meatshop-main/.env.example` para `meatshop-main/.env` (já vem pronto, sem segredo nenhum pra preencher):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Subir o banco

Com o Docker Desktop aberto:

```powershell
docker compose up -d db
```

Confirme que ficou saudável antes de continuar (pode levar ~10s na primeira vez):

```powershell
docker inspect --format="{{.State.Health.Status}}" meatshop-postgres
```

Precisa aparecer `healthy`. Se aparecer `starting` repita o comando depois de alguns segundos.

## 4. Rodar as migrations

```powershell
cd meatshop-backend
npm run migration:run
```

Se for a primeira vez (volume do banco vazio), isso cria o schema inteiro. Se o volume já existia com dados de uma execução anterior, ele só aplica o que estiver pendente — rodar de novo sem nada pendente não faz nada (mensagem `No migrations are pending`).

## 5. Rodar o backend

```powershell
# ainda em meatshop-backend
npm run start:dev
```

Deixa esse terminal aberto (roda em watch mode, recompila sozinho a cada mudança). Confirme que subiu: `http://localhost:3001/docs` deve abrir o Swagger.

## 6. Rodar o frontend

Em um **segundo terminal**:

```powershell
cd meatshop-main
npm run dev
```

Confirme em `http://localhost:3000` — deve redirecionar pra `/login`.

## 7. Testar de ponta a ponta

1. Acesse `http://localhost:3000/register` e cadastre um açougue de teste (o formulário já cria a unidade + o usuário dono + já loga automaticamente).
2. Você deve cair direto em `/dashboard` autenticado.
3. Em `/products/new`, se aparecer "Nenhuma categoria ainda — criar uma", vá em `/categories` e cadastre uma categoria antes de criar o primeiro produto.

Se tudo isso funcionar, o ambiente está 100% funcional.

## Comandos úteis

| O que | Comando |
|---|---|
| Ver logs do banco | `docker logs meatshop-postgres` |
| Parar o banco (mantém os dados) | `docker compose stop db` |
| Apagar o banco e recomeçar do zero | `docker compose down -v` (⚠️ apaga todos os dados — precisa rodar as migrations de novo depois) |
| Rever o histórico de migrations aplicadas | `docker exec meatshop-postgres psql -U meatshop_user -d meatshop -c "SELECT * FROM migrations ORDER BY id DESC;"` |
| Gerar uma nova migration depois de mudar uma entity | `npm run migration:generate -- src/database/migrations/NomeDaMudanca` (dentro de `meatshop-backend`) |
| Rodar typecheck/lint do backend | `npm run typecheck` / `npm run lint` (dentro de `meatshop-backend`) |
| Rodar typecheck/lint do frontend | `npm run typecheck` / `npm run lint` (dentro de `meatshop-main`) |

## Problemas comuns

- **`error during connect ... dockerDesktopLinuxEngine`**: o Docker Desktop não está aberto. Abra o app e espere o ícone da baleia ficar estável antes de rodar qualquer `docker`/`docker compose`.
- **Backend não sobe / erro de módulo não encontrado**: confira se não sobrou nenhum arquivo órfão em `meatshop-backend/src/**` referenciando entidades antigas que não existem mais — rode `npm run typecheck` pra achar.
- **Porta 3000/3001/5433 já em uso**: outro processo (às vezes uma instância antiga do próprio backend/frontend) já está escutando ali. No Windows: `Get-NetTCPConnection -LocalPort 3001 -State Listen` pra achar o processo e encerrar.
- **`DB_SYNCHRONIZE`**: sempre `false` no `.env` local e no `.env.docker` do backend. O schema é controlado só pelas migrations — nunca pelo TypeORM criando/alterando tabelas sozinho.
