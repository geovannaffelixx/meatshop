# Setup rápido — MeatShop completo com Docker

Este é o fluxo recomendado para apresentação e avaliação do projeto. Ele sobe automaticamente:

- PostgreSQL 17;
- migrations do banco;
- backend NestJS;
- frontend Next.js.
- chatbot FastAPI conectado somente ao backend.

Não é necessário instalar Node.js, executar `npm install` ou criar arquivos `.env`. As variáveis locais de demonstração já estão declaradas no `docker-compose.yml`.

Para testar o login do mobile com o Firebase real, baixe uma conta de serviço do projeto `meatshop-3c78f`, salve-a como `secrets/firebase-service-account.json` e inicie o ambiente com:

```powershell
.\scripts\start-local-with-firebase.ps1
```

O script valida o projeto, injeta a credencial somente no processo Docker e nunca a adiciona ao repositório.

> As credenciais e chaves do Compose são exclusivas para desenvolvimento local. Nunca use esses valores em produção.

## Pré-requisitos

- Git;
- Docker Desktop aberto e com o engine em execução;
- repositório `meatshop-chatbot` clonado ao lado deste repositório;
- portas `3000`, `3001`, `5433` e `8000` disponíveis.

Confira rapidamente:

```powershell
docker --version
docker compose version
```

## Primeira execução — somente 3 comandos

```powershell
git clone --branch develop --single-branch https://github.com/geovannaffelixx/meatshop.git
git clone --branch develop --single-branch https://github.com/VIN1RM/meatshop-chatbot.git
cd meatshop
$env:GROQ_API_KEY="sua-chave-local"
docker compose up -d --build
```

Na primeira execução, o download das imagens e a instalação das dependências podem levar alguns minutos. As próximas inicializações usam cache e são bem mais rápidas.

Confira quando tudo estiver pronto:

```powershell
docker compose ps
```

O resultado esperado é:

- `meatshop-postgres`: `healthy`;
- `meatshop-backend`: `healthy`;
- `meatshop-frontend`: `healthy`;
- `meatshop-chatbot`: `healthy`;
- `meatshop-migrator`: `Exited (0)` — isso significa que as migrations terminaram corretamente.

## Endereços

| Serviço | Endereço |
|---|---|
| Aplicação web | http://localhost:3000 |
| Cadastro inicial | http://localhost:3000/register |
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/docs |
| Health check | http://localhost:3001/health |
| Chatbot (health local) | http://localhost:8000/health/live |

## Preparar a demonstração

Na primeira execução o banco estará vazio:

1. Abra http://localhost:3000/register.
2. Cadastre o açougue e o usuário proprietário.
3. Cadastre ao menos uma categoria antes do primeiro produto.
4. Os dados ficam persistidos no volume Docker e continuam disponíveis depois de desligar os containers.

Recomenda-se fazer esse cadastro antes da apresentação para deixar os dados demonstrativos prontos.

## Uso diário

Depois que as imagens já foram construídas, para iniciar novamente:

```powershell
docker compose up -d
```

Para aplicar alterações recentes do código:

```powershell
git pull
docker compose up -d --build
```

Para parar sem apagar os dados:

```powershell
docker compose down
```

## Logs e diagnóstico

Ver todos os logs:

```powershell
docker compose logs -f
```

Ver apenas backend ou frontend:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f chatbot
```

Validar a configuração antes de subir:

```powershell
docker compose config --quiet
```

Se alguma porta estiver ocupada no Windows:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,3001,5433,8000
```

## Recomeçar com banco vazio

Este comando apaga definitivamente o banco, uploads e demais volumes locais do projeto:

```powershell
docker compose down -v
docker compose up -d --build
```

Use somente quando realmente quiser descartar os dados da demonstração.

## Observabilidade opcional

Prometheus e Grafana não sobem por padrão para deixar o início mais rápido. Para incluí-los:

```powershell
docker compose --profile observability up -d
```

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002
- Login inicial do Grafana: `admin` / `admin`

## Serviços e variáveis

O `docker-compose.yml` é autocontido para desenvolvimento:

- banco interno: `db:5432`;
- API acessada pelo navegador: `http://localhost:3001`;
- frontend: `http://localhost:3000`;
- chatbot interno: `http://chatbot:8000`;
- migrations automáticas antes do backend;
- `DB_SYNCHRONIZE=false`, garantindo que o schema seja controlado apenas pelas migrations;
- integrações externas (Mercado Pago, e-mail e Firebase) ficam desativadas quando não configuradas e não impedem o restante da aplicação de funcionar.

O chatbot sobe sem gravar segredos no Compose, mas só gera respostas quando `GROQ_API_KEY`
está definida no terminal. A chave interna entre backend e chatbot já possui um valor exclusivo
de desenvolvimento e nunca deve ser reutilizada em produção.

Para criar pelo painel uma conta que também fará login no aplicativo (inclusive entregadores vinculados), informe `FIREBASE_SERVICE_ACCOUNT` como o JSON da conta de serviço em uma única linha antes de executar o Compose. A ausência dessa credencial não impede a inicialização, mas esse cadastro específico retorna indisponibilidade para evitar uma conta parcialmente criada somente no PostgreSQL.

Para credenciais reais ou deploy, use secrets externos e nunca reaproveite os valores locais do Compose.

O checklist completo de infraestrutura, segurança, LGPD, observabilidade, deploy e rollback está em [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).
