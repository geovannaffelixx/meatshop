# 💾 MeatShop Backend — NestJS + SQLite + TypeORM
- **Endpoints:** `/health, /metrics, /auth/register, /auth/login, /auth/verify-code, /auth/reset-password, /users/me, /dashboard`
- **Banco:** `data/meatshop.db (SQLite)`
- **Dockerfile:** `(porta 3001)`
- `Utiliza Token Fake e banco local então não tem arquivo/configuração .env`
- 💡 `Emoticons com a extensão` **emojisense** `no VSCode`

-----------------------------------

# 💻 Tecnologias utilizadas:                                     
- **Back-end**: NestJS + SQLite + TypeORM                                 
- **Front-end**: Next.js 14 + Tailwind + ESLint 
- **Testes**: Jest (back-end) + Supertest
- **Containerização:** Docker + Docker Compose  
- **CI/CD:** GitHub Actions (build, lint, test e deploy)  
- **Monitoramento:** Prometheus + Grafana  
- **Logs:** Winston (simulação local)

-----------------------------------

# 🚀 Como executar:

### <ins>Backend com npm install:</ins>
1. Rodar os comandos:
    - cd meatshop-backend
    - npm install
    - npm run start:dev
2. Acessar:
    - [http://localhost:3001/health](http://localhost:3001/health)
    - [http://localhost:3001/metrics](http://localhost:3001/metrics)

### <ins>Frontend:</ins>
1. Rodar os comandos:
      - cd meatshop-main
      - npm install
      - npm run dev
2. Acessar:
      - [http://localhost:3000](http://localhost:3000)

### <ins>Backend e Frontend juntos com Docker:</ins>
1. Abrir o docker desktop.
2. Rodar no terminal o comando:
   - docker compose up --build
3. Acessar:
   - Frontend: [http://localhost:3000](http://localhost:3000)   
   - Backend: [http://localhost:3001](http://localhost:3001)  
   - Prometheus: [http://localhost:9090](http://localhost:9090)  
   - Grafana: [http://localhost:3002](http://localhost:3002)  

4. Backend e Frontend já vão estar integrados e funcionando em conjunto, permitindo o cadastro, login e etc.

-----------------------------------

# 🧪 Testes automatizados:

- O projeto utiliza **Jest** com ambiente `jsdom` e suporte a TypeScript.

### <ins>Rodar todos os testes:</ins>
```bash
npm run test
```

### <ins>Rodar com cobertura:</ins>
```bash
npm run test:cov
```

Os testes incluem:
- Validação de autenticação (login e cadastro)  
- Respostas de endpoints principais  
- Verificação do `/health` e `/metrics`

-----------------------------------

# 📈 Logs e Monitoramento:

## 🔹<ins> Logs (Winston):</ins>
- Os logs de execução são capturados com **Winston**, configurado para exibir mensagens no console.  
- O formato inclui timestamp, nível do log e contexto (ex.: `AuthService`, `AppController`).  

Exemplo de saída:

[2025-10-03 10:15:42] INFO [AuthService] Usuário autenticado com sucesso.
[2025-10-03 10:15:43] WARN [AppController] Tentativa de login inválido detectada.

--> É possível adaptar a configuração para salvar logs em arquivo (`/logs/app.log`) ou enviar para ferramentas externas (Grafana Loki, Elastic Stack, etc.).

## 📊 Monitoramento com Prometheus e Grafana:

- O projeto já vem configurado para **monitoramento automático de métricas do backend**.  
- As métricas são expostas no endpoint padrão `/metrics` e coletadas periodicamente pelo Prometheus e enviadas ao Grafana.

### 🔸 Endpoint `/metrics`

Disponibiliza informações de desempenho e saúde da API, como:
- `http_request_duration_seconds`: tempo de resposta por rota  
- `http_requests_total`: número total de requisições  
- `process_cpu_seconds_total`: uso de CPU  
- `process_resident_memory_bytes`: uso de memória  

Acesse:  
    - **http://localhost:3001/metrics**

-----------------------------------

# 🔸 Configuração do Prometheus

O arquivo `prometheus.yml` define o job de coleta:

```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: 'meatshop-backend'
    static_configs:
      - targets: ['meatshop-backend:3001']
```

- **scrape_interval:** coleta a cada 5 segundos  
- **targets:** endereço do backend dentro da rede Docker  

Quando o Docker é iniciado, o Prometheus lê esse arquivo e começa a capturar as métricas automaticamente.

## 🔸 Acesso ao Prometheus

- **Interface:** [http://localhost:9090](http://localhost:9090)  
- **Exemplo de consulta:**  
    - http_requests_total
    - process_cpu_seconds_total

  Essas consultas exibem dados de requisições e consumo de CPU em tempo real.

-----------------------------------

# 🔸 Integração com Grafana

O Grafana utiliza o Prometheus como **Data Source** para gerar **dashboards interativos**.

Após subir o Docker, acesse:  
    - **http://localhost:3002**

**Login padrão:**  
- Usuário: `admin`  
- Senha: `admin`  

> Ao entrar, adicione o Prometheus como fonte de dados (`http://prometheus:9090`)  
> e importe um dashboard pronto (ID 3662 ou 7587, por exemplo, do Grafana Labs).

Com isso, você pode visualizar:
    - Taxa de requisições por segundo.  
    - Tempo médio de resposta.  
    - Erros 4xx e 5xx.  
    - Uso de CPU e memória do backend.  

## 🔸 Benefícios do monitoramento integrado:

✔️ Permite **acompanhar o comportamento em tempo real** do backend.  
✔️ Facilita **detecção de gargalos** (ex.: endpoints lentos).  
✔️ Gera **histórico de desempenho** útil para o relatório final.  
✔️ Cumpre os requisitos da Sprint 2 (registro de execuções e coleta de métricas).  

-----------------------------------

# 🔄 Integração Contínua (GitHub Actions):

O pipeline CI/CD garante qualidade do código e execução automatizada de testes e build.

Etapas executadas automaticamente:
1. **Instala dependências**  
2. **Roda lint** (`npm run lint`)  
3. **Executa testes** (`npm run test`)  
4. **Realiza build** (`npm run build`)  
5. **Faz deploy** (opcional, configurável)  

O arquivo de configuração fica em `.github/workflows/ci.yml`.

-----------------------------------

# 🧠 Boas práticas:

- Código modularizado e tipado (TypeScript + NestJS)  
- Estrutura de módulos escalável  
- Uso de DTOs e validações com `class-validator`  
- Banco de dados leve (SQLite) para simulação local  
- Monitoramento e logs integrados  
- Preparado para migração futura para PostgreSQL

-----------------------------------

# 🛠️ Alterações planejadas (Back-End):

| 🏷️ **Categoria** | 🧾 **Descrição** | 📅 **Status** |
|:----------------|:-------------:|:--------:|
| 🔑 **Autenticação** | Substituir token fake por JWT real com refresh token. | Em planejamento. |  
| 📝 **Documentação** | Atualização geral e melhoria da documentação. | Em andamento. |
| 🗃️ **Banco de Dados** | Migrar de SQLite para PostgreSQL em Docker. | Banco desenvolvido por `Vinícius` <br>implementação em andamento. |  
| 🧱 **Arquitetura** | Reestruturar Back-End para modelo em camadas. | Em planejamento. |
| 🧪 **Teste** | Expandir testes unitários para cobrir mais casos. | Em planejamento. |  
| ⚙️ **CI/CD** | Melhorias de pipeline com deploy automatizado. | Futuro. |  

--> ✅ Esta lista será atualizada continuamente conforme o desenvolvimento e as próximas entregas do PI.

-----------------------------------

# 📃 Resumo geral (Serviços e Endpoints):

## ⚙️ Serviços Locais

| 🌐 **Serviço** | 🔗 **URL** | 🚪 **Porta** |
|:----------------|:-------------:|:--------:|
| 🧠 Backend | [http://localhost:3001](http://localhost:3001) | 3001 |
| 💻 Frontend | [http://localhost:3000](http://localhost:3000) | 3000 |
| 📊 Prometheus | [http://localhost:9090](http://localhost:9090) | 9090 |
| 📈 Grafana | [http://localhost:3002](http://localhost:3002) | 3002 |

## 🌐 Endpoints Principais

| Método | Endpoint | Descrição |
|:---------|:-----------:|:------------:|
| `POST` | `/auth/register` | Cadastra usuário (com todos os campos do açougue). |
| `POST` | `/auth/login` | Autentica por usuário **ou** e-mail + senha, retorna token fake. |
| `POST` | `/auth/verify-code` | Simula verificação de código (exemplo: `1234`). |
| `POST` | `/auth/reset-password` | Redefinição de senha. |
