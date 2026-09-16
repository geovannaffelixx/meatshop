# Roadmap consolidado — Painel Web da Unidade MeatShop

**Atualizado em:** 1º de setembro de 2026

**Escopo deste documento:** backend e painel web usados pela unidade/açougue.

**Fora deste repositório:** aplicativo Flutter único, com perfis e fluxos distintos para cliente e entregador, integrado ao Firebase.

## Critério de conclusão

Neste roadmap, **concluído funcionalmente** significa que:

- a tela real existe e não é placeholder;
- a tela consome o endpoint correspondente do backend;
- autenticação e autorização da unidade são aplicadas;
- estados de carregamento, erro e sucesso foram tratados;
- banco, migrations, backend e frontend compilam e sobem pelo Docker.

Isso não equivale a uma certificação de produção. Testes integrais, hardening, LGPD, performance, integrações externas reais e deploy estão registrados separadamente como evolução transversal.

## Resumo executivo

O **escopo funcional atual do painel web da unidade está concluído e integrado ao backend**. Todos os módulos expostos na navegação possuem implementação real. O componente legado `UnderConstruction` não é usado por nenhuma rota do painel.

O painel e a API podem ser considerados encerrados como baseline funcional da unidade para apresentação e para início da próxima frente. As pendências globais descritas ao final não reabrem os CRUDs e fluxos operacionais já concluídos; elas elevam o produto a um nível completo de produção.

## 1. Fundação e acesso — concluído

- Cadastro e login da unidade.
- Cookies HttpOnly, access token e refresh token.
- Recuperação e redefinição de senha.
- Route guard global com estados de carregamento e redirecionamento.
- Mapa declarativo de acesso por rota.
- Contexto da unidade ativa e permissões locais.
- Sidebar organizada por áreas e filtrada pelas permissões do usuário.
- Identidade visual, logo da unidade, favicon e metadados do sistema.

## 2. Operação da unidade — concluído

### Dashboard

- Indicadores operacionais e financeiros.
- Gráficos de pedidos e vendas.
- Alertas de estoque, produtos mais vendidos e informações de clientes/entregas.

### Pedidos

- Listagem, busca e filtros.
- Detalhe completo do pedido e seus itens.
- Confirmação e avanço de status.
- Cancelamento com motivo.
- Agendamento e reagendamento.
- Informações de pagamento e entrega.
- Acesso direto ao chat relacionado ao pedido.

### Entregas

- Painel operacional e indicadores ao vivo.
- Mapa centralizado na localização geocodificada da unidade.
- Posição em tempo real enviada pelo entregador.
- Listagem, aprovação e gestão de entregadores vinculados.
- Atribuição e remoção de entregador por pedido.
- Fluxo de aceite e atualização de status da entrega.
- Código seguro de retirada validado pela unidade.
- Código seguro de entrega validado no destino.
- Hash, expiração, limite de tentativas e bloqueio temporário dos códigos.

### Chat do pedido

- Central de mensagens no painel.
- Histórico persistente por pedido.
- Canais privados separados:
  - unidade ↔ cliente;
  - unidade ↔ entregador;
  - cliente ↔ entregador, disponível para os clientes Flutter da API.
- WebSocket autenticado por cookie HttpOnly.
- Envio REST com publicação em tempo real.
- Indicador de conexão e digitação.
- Confirmação de leitura.
- Notificação ao destinatário.
- Acesso para funcionários ativos autorizados da unidade.
- Bloqueio de novas mensagens após entrega ou cancelamento, preservando o histórico.

## 3. Catálogo e estoque — concluído

- CRUD de produtos.
- Fotos de produtos.
- Atualização de preço, descrição, marca, categoria e disponibilidade.
- Controle e atualização de estoque.
- Alertas de estoque mínimo.
- Criação, edição e ativação/desativação de categorias.

## 4. Marketing e relacionamento — concluído

- Promoções: criação, edição, ativação e desativação.
- Cupons de plataforma e de unidade, regras de elegibilidade e histórico de resgates.
- Receitas: CRUD, imagem, passos, ingredientes e produtos relacionados.
- Avaliações recebidas pela unidade, produtos e entregadores.

## 5. Gestão — concluído

### Financeiro

- Resumo de receitas e despesas.
- Relatórios e gráficos.
- Criação, edição e exclusão de despesas.
- Filtros por período e informações consolidadas.

### Notificações

- Sino global, central de notificações e pop-ups em tempo real.
- Contexto da unidade.
- Leitura individual e em lote.

### Suporte

- Abertura e acompanhamento de chamados.
- Conversa persistente e envio de imagens.
- Encerramento e reabertura.
- Console administrativo para atendimento global.

### Auditoria

- Trilha append-only de ações e falhas.
- Sanitização de informações sensíveis.
- Filtros, resumo, detalhes e exportação CSV.
- Consulta restrita ao perfil global autorizado.

## 6. Configurações — concluído

- Dados públicos e operacionais da unidade.
- Upload da logo.
- Busca do CEP pela BrasilAPI.
- Preenchimento de logradouro, bairro, cidade e UF.
- Geocodificação automática da unidade sem latitude/longitude manual.
- Horários de funcionamento.
- Conta pessoal: nome, e-mail e avatar.
- Troca de senha.
- Equipe e acessos: listar, criar, alterar papel/status e remover membros.

## 7. Infraestrutura local — concluído

- Docker Compose autocontido.
- PostgreSQL 17 persistente.
- Execução automática de migrations antes da API.
- Backend e frontend com health checks.
- Build de produção de NestJS e Next.js.
- Swagger disponível no ambiente local.
- Prometheus e Grafana como perfil opcional.
- Guia de setup para clone novo na branch `develop`.

## 8. Próximas frentes globais

Estas frentes pertencem ao produto completo e aos próximos meses, não a módulos ausentes da sidebar do açougue.

### 8.1 Geolocalização avançada

- Geocodificar o endereço de destino do cliente.
- Desenhar a rota entre unidade, entregador e destino.
- Calcular distância e ETA.
- Tratar atualização/recalculo de rota e falhas do provedor cartográfico.

### 8.2 Pagamentos 100%

- Configurar credenciais reais/sandbox controlado do Mercado Pago.
- Validar cartão e PIX ponta a ponta.
- Validar webhook, idempotência, conciliação, falha, expiração e estorno.
- Integrar e testar os estados equivalentes no aplicativo Flutter.

### 8.3 Testes automatizados

- Aumentar cobertura unitária e de integração do backend.
- Criar testes de componentes e fluxos no painel Next.js.
- Criar testes unitários, widget e integration tests no Flutter.
- Criar suíte E2E envolvendo unidade, cliente e entregador.
- Incluir chat, pagamento, códigos de entrega e rastreamento nos testes críticos.

### 8.4 Qualidade e padronização

**Status:** concluído no código da versão 3.0.0.

- Passivo de lint eliminado no backend, no painel e no mobile.
- Typecheck, testes, builds, cobertura, auditoria e E2E PostgreSQL são gates obrigatórios no CI.
- Dependências e runtimes suportados atualizados; documentação técnica e operacional revisada.

### 8.5 Produção e segurança

**Status do código:** concluído para publicação, conforme `PRODUCTION_DEPLOYMENT.md`.

- Configuração fail-fast, secrets fortes, HTTPS, cookies seguros, CORS, App Check e banco sem sincronização automática.
- Rate limiting com memória limitada, validação estrita de entrada, headers seguros e proteção de uploads e WebSockets.
- Exclusão e anonimização de conta, retenção automática de localização e trilha de auditoria para os controles LGPD técnicos.
- Imagens não privilegiadas, migrations isoladas, métricas, alertas Prometheus, CodeQL e smoke de latência no CI.

**Pendente no ambiente real:** provisionar staging/produção, DNS/TLS, secret manager, backups com restauração ensaiada, homologar Firebase/Mercado Pago/SMTP/push, definir políticas e responsáveis LGPD, publicar e executar a validação pós-deploy. Essas ações dependem das contas, credenciais e decisões operacionais da organização, não de código adicional no repositório.

## Decisão de encerramento do painel

**Status:** baseline funcional do backend + painel web da unidade encerrado.

**Decisão:** o time pode iniciar a próxima frente sem manter nenhum módulo visível do painel marcado como “em construção”.

**Ressalva:** qualquer falha encontrada em homologação deve ser tratada como correção do baseline; as cinco frentes globais acima continuam planejadas como evolução do produto.
