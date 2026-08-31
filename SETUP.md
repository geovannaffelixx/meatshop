# Setup rápido — MeatShop completo com Docker

Este é o fluxo recomendado para apresentação e avaliação do projeto. Ele sobe automaticamente:

- PostgreSQL 17;
- migrations do banco;
- backend NestJS;
- frontend Next.js.

Não é necessário instalar Node.js, executar `npm install` ou criar arquivos `.env`. As variáveis locais de demonstração já estão declaradas no `docker-compose.yml`.

> As credenciais e chaves do Compose são exclusivas para desenvolvimento local. Nunca use esses valores em produção.

## Pré-requisitos

- Git;
- Docker Desktop aberto e com o engine em execução;
- portas `3000`, `3001` e `5433` disponíveis.

Confira rapidamente:

```powershell
docker --version
docker compose version
```

## Primeira execução — somente 3 comandos

```powershell
git clone --branch develop --single-branch https://github.com/geovannaffelixx/meatshop.git
cd meatshop
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
- `meatshop-migrator`: `Exited (0)` — isso significa que as migrations terminaram corretamente.

## Endereços

| Serviço | Endereço |
|---|---|
| Aplicação web | http://localhost:3000 |
| Cadastro inicial | http://localhost:3000/register |
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/docs |
| Health check | http://localhost:3001/health |

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
```

Validar a configuração antes de subir:

```powershell
docker compose config --quiet
```

Se alguma porta estiver ocupada no Windows:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,3001,5433
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
- migrations automáticas antes do backend;
- `DB_SYNCHRONIZE=false`, garantindo que o schema seja controlado apenas pelas migrations;
- integrações externas (Mercado Pago, e-mail e Firebase) ficam desativadas quando não configuradas e não impedem o restante da aplicação de funcionar.

Para credenciais reais ou deploy, use secrets externos e nunca reaproveite os valores locais do Compose.
