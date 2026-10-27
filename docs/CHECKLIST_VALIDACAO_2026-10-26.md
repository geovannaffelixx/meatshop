# Validação do checklist — 26–27/10/2026

## Escopo e branches

Revisão do arquivo `Pasted text.txt` anexado pelo usuário, seguida de implementação das lacunas encontradas. A revisão inicial foi realizada sem commits. Em 27/10/2026, o usuário autorizou commits e push nas branches indicadas; publicação e deploy não foram executados pelo agente.

| Repositório | Branch utilizada | Resultado da revisão |
|---|---|---|
| meatshop: backend, web e infraestrutura | `100completo` | Lacunas corrigidas, migrations e testes acrescentados |
| meatshop-mobile | `100completo` | Lacunas de contratos e interface implementadas |
| meatshop-chatbot | `100completo` | Sanitização de sobrenomes minúsculos e Unicode completada; demais itens existentes validados |
| meatshop-terms | `main` | Título por documento conectado à aplicação e testado |

Não interpretar “código implementado” como aceite integral em produção. O checklist original distingue código, teste, integração e aceite manual. A revisão não substitui homologação em dispositivo nem valida serviços externos com credenciais reais.

## Resultado e evidências

| Verificação | Comando/ambiente | Resultado |
|---|---|---|
| Backend: compilação e tipos | `npm run build`; `npx tsc --noEmit` | Passaram |
| Backend: lint | `npm run lint` | Passou, sem warnings |
| Backend: testes unitários | `npm test -- --runInBand` | 83 suítes, 388 testes passaram |
| Backend: banco real | `node scripts/validate-checklist.cjs` | 65 testes funcionais passaram; 1 teste k6 reprovou a latência do carrinho no pico de 500 VUs |
| Migrações | Mesmo script, PostgreSQL isolado em `127.0.0.1:55432` | Up, nove reversões e reaplicação passaram; CPF/telefone existentes recuperados no rollback e cifrados novamente |
| Funções nos arquivos alterados do backend, incluindo B19 e inicialização | `node scripts/check-function-length.cjs` | Nenhuma acima de 40 linhas; relatório `CHECKLIST_FUNCTION_LENGTH.json` |
| Web: lint, tipos e build | `npm run lint`; `npm run typecheck`; `npm run build` | Passaram |
| Web: Jest | `npm test` | 33 suítes, 116 testes passaram |
| Web: Cypress | `npm run test:e2e`, produção em `http://localhost:3000`, API stubada em `http://localhost:3001` | 6 specs, 12 testes passaram em Electron headless |
| Mobile | `flutter analyze`; `flutter test` | Nenhum problema na análise; 190 testes passaram |
| Chatbot | `python -m ruff check .`; `python -m pytest -q -p no:cacheprovider` | Ruff passou; 124 testes passaram |
| Termos | `npm test`; `npm run build` | 6 testes e build passaram |
| Infraestrutura | `docker compose config --quiet`, incluindo configuração de escala | Configurações válidas, com variáveis efêmeras locais |
| Alertas | Parse das expressões com `promql-parser` | 12 expressões válidas |
| Segurança de dependências | `npm audit --audit-level=high`, backend e web | Nenhuma vulnerabilidade alta/crítica; backend mantém uma moderada de desenvolvimento em `fast-uri`; produção do backend e web sem vulnerabilidades no audit executado |

O sandbox do Windows impediu iniciar Electron; o Cypress passou quando executado fora dele. No PowerShell, a variável herdada `ELECTRON_RUN_AS_NODE` foi removida somente do processo de teste. Os testes não usaram credenciais reais.

### Integração e carga

O script de validação recusa reset fora do usuário `meatshop_validation`, porta `55432` e três bancos com nomes fixos de teste. Não usa o banco de desenvolvimento do usuário. Chaves são aleatórias por execução e não aparecem nos logs.

Logs locais, ignorados pelo Git: `meatshop-backend/test-results/checklist/`. Resumos k6: `meatshop-backend/test-results/k6-{performance,load,spike}.json`.

Integração funcional PostgreSQL: **65 testes passaram**, incluindo carrinho com vários itens, autorização/estoque, atribuição da auditoria após rollback e bloqueio legal imediatamente após revogação. A execução completa terminou com **65 aprovados e 1 reprovado**, exclusivamente pelo limiar k6 do carrinho em 500 VUs. **B17 ainda não está aprovado.**

Última rodada completa, 27/10/2026, tempos p95 em milissegundos:

| Cenário | Busca (< 2.000) | Carrinho (< 1.000) | Checkout (< 3.000) | Erros (< 5%) | Resultado |
|---|---:|---:|---:|---:|---|
| Performance: 30 VUs / 2 min | 9,53 | 58,96 | 121,36 | 0% | Aprovado |
| Load: 50 VUs / 2 min | 12,59 | 62,96 | 188,08 | 0% | Aprovado |
| Spike: até 500 VUs | 622,17 | **1.340,09** | 2.476,20 | 0% | **Reprovado no carrinho** |

Os critérios não foram relaxados e a CI mantém a reprovação bloqueante. Foi solicitada ao usuário a definição do ambiente de referência e do orçamento de CPU/memória/réplicas para o aceite de 500 usuários. Os números locais não constituem aprovação desse item.

Os cenários mantêm os critérios originais: busca p95 < 2 s, atualização de carrinho p95 < 1 s, checkout p95 < 3 s e erros < 5%. São 30 VUs/2 min, 50 VUs/2 min e pico de 500 VUs. Cada VU usa uma conta isolada; todos disputam o mesmo produto, exercitando também contenção de estoque. O script altera a quantidade, compra, cancela e limpa o carrinho. O resultado local não certifica capacidade do ambiente de produção.

Durante a revisão foram encontrados e corrigidos esgotamento do pool de conexões na cotação e formato incorreto do retorno SQL na fila de webhooks. A consulta de horários e unidade agora usa a conexão da transação; o worker usa CTE com retorno uniforme. A atualização de item de carrinho evita a leitura e transação adicional de `save`.

O estoque agora é validado e reservado no fim da mesma transação, com bloqueio ordenado, para reduzir a duração da seção crítica. O teste de disputa pela última unidade exige um único checkout aprovado e estoque nunca negativo. A atualização do carrinho usa duas consultas: dono/produto/categoria/unidade/estoque em uma leitura e alteração com retorno de todos os itens em uma CTE. O retorno sobrepõe os valores do `RETURNING` ao snapshot do SELECT, preservando os outros itens. A leitura seleciona somente os campos necessários. O k6 também exige que o produto semeado apareça nos resultados reais da busca.

A observação de `pg_stat_activity` durante o pico confirmou espera por bloqueio na reposição de estoque dos cancelamentos. A reposição também foi movida para o fim da transação de cancelamento, depois de histórico, cupom e pagamento, mantendo atomicidade e ordem dos produtos.

`DB_POOL_MAX` é configurável e validado como inteiro positivo; mantém padrão 10 por processo. A rodada final de carga e o job de CI usam **6 processos da API compilada, pool 10 por réplica**, PostgreSQL e adaptador de sockets compartilhados, atrás de proxy round-robin local. Cada processo usa o AppModule e validações reais, com notificações externas substituídas por mocks. O processo dos fixtures usa pool 5. `K6_REPLICAS` controla as réplicas descartáveis; `K6_DB_POOL_MAX` controla seus pools. Inicialização aguarda readiness e o encerramento elimina os processos iniciados pelo teste.

Dimensionar `replicas × (DB_POOL_MAX + até 5 conexões do adaptador de sockets)`, mais reserva administrativa, dentro do limite do PostgreSQL. Seis réplicas com pool 10 reservam até 90 conexões, mais 5 dos fixtures e reserva administrativa, abaixo do limite local de 100. Exemplos e Compose expõem as opções; o Compose de escala usa `SCALE_BACKEND_REPLICAS` e mantém padrão 2. Para reproduzir a topologia medida em containers, configurar `SCALE_BACKEND_REPLICAS=6` e `DB_POOL_MAX=10`. Containers e deploy não foram iniciados nesta revisão.

Ambiente de medição local: Windows, 12 CPUs lógicas disponíveis, Node 22.16.0, PostgreSQL 17 e k6 2.0.0. As réplicas compartilham o mesmo produto e IP de cliente, exercitando contenção de estoque e do contador por IP. Resultados exploratórios de uma, três, quatro e seis instâncias foram preservados em `test-results/checklist/`; não são considerados aprovação de B17.

O perfil de CPU identificou reconstrução da chave JWT e consultas extras de contexto de auditoria. A chave HMAC agora é preparada uma vez, com algoritmo restrito a HS256; o formatador de horários também é reutilizado. Contexto de auditoria é configurado antes das escritas, reaproveitado somente no mesmo QueryRunner/contexto e invalidado nos limites de transação; leituras não consultam esses GUCs, que são consumidos apenas pelos triggers DML. Mudanças de usuário e escritas de background reconfiguram o contexto. Eventos de auditoria usam INSERT atômico, mantendo a admissão durável antes da mutação. Testes unitários e PostgreSQL conferem rollback e atribuição de ator.

A proteção legal consulta apenas estado/versionamento/último aceite, sem carregar o conteúdo dos documentos em toda requisição e sem cache que atrase revogações. Fixtures gerais usam `LEGAL_ACCEPTANCE_REQUIRED=false`; o teste específico de bloqueio/reaceite força a proteção verdadeira e as réplicas de carga sempre usam `true`.

Para repetir localmente, iniciar a instância PostgreSQL descartável criada em `%TEMP%/meatshop-checklist-pg-20261026`, escutando somente `127.0.0.1:55432`, usuário `meatshop_validation`, e executar no PowerShell da raiz:

```powershell
$env:DB_POOL_MAX='5'
$env:K6_REPLICAS='6'
$env:K6_DB_POOL_MAX='10'
$env:K6_ENABLED='true'
$env:K6_SCENARIO='all'
node scripts/validate-checklist.cjs
```

No ambiente real, configurar e guardar as duas chaves de dados antes de aplicar as migrations. Reutilizar as mesmas chaves após o backfill e nos processos que acessam o mesmo banco. As migrations desta revisão foram aplicadas apenas nos bancos descartáveis de teste.

A migration `RefreshIdentitySession` acrescenta `authenticated_at`: rotações preservam a autenticação original para comparar com `tokensValidAfterTime` do Firebase. Troca/reset de senha, revogação ou remoção de conta no Firebase impedem o refresh local. Indisponibilidade do provedor responde sem consumir o refresh token. Sessões Firebase anteriores à migration são revogadas para exigir nova autenticação, pois a cadeia legada não guardava esse horário; rollback de schema não reativa tokens revogados por segurança. Access tokens já emitidos continuam sujeitos à validade curta existente.

## Matriz por item

Legenda: **implementado** significa encontrado e conectado ou completado nesta revisão; **contrato** significa exercitado por testes locais/mocks, sem sessão real entre todos os aplicativos. Aceite manual integral permanece pendente para os itens abaixo, exceto a inspeção visual pontual registrada em W7.

### Backend

| Item | Código e evidência | Teste/integração e limites |
|---|---|---|
| B1 | `PromotionalPriceService` conectado à cotação e criação; preço final participa da assinatura e dos itens; cupom aplicado depois | Testes de preço/cupom/cotação e contrato PostgreSQL de cotação/pedido com promoção |
| B2 | `CheckoutUnitPolicyService` usa `BusinessHoursValidator` em cotação/criação; agendamento preserva validação de slot | Testes aberto/fechado/agendado e contrato `UNIT_CLOSED` |
| B3 | Prazo offline configurável, ou início do slot; expiração usa ciclo idempotente existente de cancelamento, estoque, cupom, histórico e notificações | Pagamentos e contrato com duas execuções de expiração; entrega efetiva da notificação depende do provedor |
| B4 | Confirmação manual pela loja mantida; checkout offline não exige comprovante antecipado | Fluxo de confirmar/preparar/retirar no contrato de pedido |
| B5 | Campo/migration/rollback existentes; endpoint autorizado e auditado; filtros públicos de unidades, produtos, busca e promoções; bloqueio no checkout | Testes de autorização e API; rollback validado; promoção pública e gestão usam rotas distintas |
| B6 | Placeholders vazios removidos; PATCH de produto permanece responsável pela ativação | Busca de referências, testes de produto, compilação |
| B7 | Constantes de 5 tentativas/15 min; `ACCOUNT_LOCKED`, `retry_after_seconds`, `locked_until` e `Retry-After` | Concorrência de tentativas em PostgreSQL e contrato HTTP de bloqueio/desbloqueio |
| B8 | AES-256-GCM e índices cegos HMAC separados; migration para dados existentes; unicidade por hash; exportação decifra somente campos autorizados | Crypto, cadastro/exportação, banco real, rollback/reaplicação com CPF/telefone existentes |
| B9 | Refresh ligado ao serviço de sessões; rotação/reuso revogam sessões; troca/reset local ou invalidação Firebase revogam refresh tokens; horário original preservado | Contratos de rotação/reuso/logout/troca/reset e identidade Firebase, inclusive falha transitória; access tokens já emitidos mantêm validade curta até expirar |
| B10 | Endpoint/cookie/header CSRF, comparação constante, exceções explícitas e CORS, incluindo Idempotency-Key | Testes de política e HTTP com cookie/token ausente/válido; Bearer independente de cookies |
| B11 | Login, Firebase, registro de unidade e refresh compartilham política de tokens somente no JSON mobile; web recebe cookies | Login web/mobile e sessão testados; Firebase com mocks do provedor |
| B12 | `/metrics` exige Bearer configurado e chave forte em produção; métricas de processo mantidas | Testes HTTP/configuração; scrape externo pendente |
| B13 | Eventos append-only ACCEPTED/REVOKED, endpoint auditado/Swagger, revogabilidade explícita e reaceite | Contrato de histórico/reaceite/privacidade não revogável, HTTP 403 após revogar, recuperação e desbloqueio após reaceitar com guard obrigatório; rollback recusa apagar histórico real de revogação |
| B14 | Sanitização antes do chatbot e persistência, inclusive sobrenomes minúsculos e acentos Unicode decompostos; preserva pedido culinário e instruções para o filtro de segurança; auditoria sanitiza campos sensíveis | IA, stream e sanitização testados; provedor Groq real não acionado |
| B15 | Contador atômico PostgreSQL compartilhado, limpeza de janela, headers e métrica de rejeição | Concorrência de duas instâncias do middleware com banco real; socket entre instâncias também exercitado |
| B16 | Assinatura validada antes de enfileirar; persistência durável antes do 200; lease, retry/backoff, idempotência e estado FAILED; reconciliação preservada | Testes de assinatura/controlador, deduplicação/retry em banco; não enviado pagamento real ao Mercado Pago |
| B17 | Três cenários implementados e ligados à CI; credenciais temporárias removidas ao fim; réplicas isoladas e perfil de CPU opcionais | **Pendente/reprovado:** 30/50 passaram; 500 falhou no p95 do carrinho, conforme tabela. Necessário resolver no ambiente de referência antes do aceite |
| B18 | Módulo de cartões salvos, entidade, rotas, exportação e placeholders vazios removidos | Busca de referências, compilação, migrations drop/recriação passaram |
| B19 | Funções extraídas em todos os arquivos alterados do backend, inclusive startup/configuração e promoções; verificador AST considera corpos não vazios/não comentário | Relatório sem violações; testes dos módulos afetados passaram |
| C4 | `contact` opcional, espaços normalizados, limite 150, Swagger e coluna cifrada; autorização preservada | DTO, persistência cifrada, exportação e negativa para outro usuário |
| C5 | Outbox transacional com triggers em status/taxa e liquidação; evento `/delivery`, sala `user:{id}`, payload `{orderId}` | Testes do dispatcher/destinatário e trigger de status/liquidação em PostgreSQL; sessão de app real pendente |
| C6 | Retirada global ou por unidade, sem endereço obrigatório/taxa/entregador; código de cliente obrigatório para concluir READY → DELIVERED | Contrato de pedido, código ausente/incorreto/correto; hash não retorna no JSON |

### Web

| Item | Implementação/evidência | Validação e limites |
|---|---|---|
| W1 | Proxy Next 16 e lista pública compartilhada; fallback seguro no RouteGuard para cookie em domínio da API | Testes de rotas públicas/privadas/cookies e build de produção |
| W2 | Usuário em memória; unidade selecionada é o identificador persistido | Testes de sessão/cache; não persistir CPF/tokens em localStorage |
| W3 | Exportação autenticada, download JSON e estados de feedback | Testes de sucesso/erro e conteúdo/arquivo |
| W4 | CSRF sob demanda em memória, retry único, refresh/upload cobertos, reset em autenticação | Testes de cliente e uploads; contrato da API testado separadamente |
| W5 | Dependências aposentadas ausentes do manifest/lockfile e imports | Lint, audit e build |
| W6 | Placeholder removido; `/verify-email` trata token e feedback | Testes de tela; envio real de e-mail e clique no link pendentes |
| W7 | Labels/id, legendas acessíveis, aria-label em ícones, filtros aria-pressed, main único, skip link e fonte mínima; textos auxiliares/receitas/estrelas e placeholders com cores mais escuras; timestamps de mensagens próprias em branco | Lint e Cypress de estrutura, fonte mínima e contraste >= 4,5 dos placeholders na tela de produto; captura em 390 px inspecionada; auditoria completa WCAG/leitor de tela permanece pendente |
| W8 | Helper de labels de despesas, inclusive fallback | Testes de enum/helper |
| W9 | Config ESM padrão e specs login/produtos/pedidos/promoções, além de geolocalização e acessibilidade | 12 testes headless passaram; API stubada |
| C7 | Configuração de unidade com confirmação, feedback e status recarregado; controle OWNER | Testes existentes de configurações/permissões; API autorizada em teste local |
| C4 | Detalhe tipado renderiza contato quando presente; servidor limita acesso | Contrato de API testado; revisão visual do chamado real pendente |

### Mobile

| Item | Implementação/evidência | Validação e limites |
|---|---|---|
| C1 | Header mobile nos transports, autenticação, refresh e stream | Testes HTTP/autenticação |
| M1 | Busca de mojibake em `lib/` e `test/` sem ocorrências identificadas | Analyze e testes; revisão integral em dispositivo pendente |
| M2 | Erros de review, produto, pedido/repetição, unidade, pagamento e relatórios usam mensagens localizadas/fallback | Testes de falha/localização; busca restante de exceções cruas nas telas encontrou somente logs de diagnóstico |
| M3 | Estoque fracionário real em modelos/produtos/promoções/carrinho/sacola/home; bloqueio acima do disponível | Testes de modelos e carrinho; estoque final também validado pelo backend |
| M4 | Endpoint paginado com filtro de concluídos; sem corte de 90 dias; subtítulo de histórico completo; carregamento incremental e deduplicação | Testes de páginas/fim com pedido de 2020, retry na mesma página, deduplicação e atualização de item repetido na interface |
| M5 | Marca combinada com nome/categoria/preço via busca compartilhada; aplicar/limpar em cortes e açougue | Teste de parâmetros combinados; validação visual em dispositivo pendente |
| M6/C4 | Campo opcional de contato, máximo 150, transporte/modelo/detalhe conectados | Widget/contrato/modelo testados; API cifrada validada separadamente |
| M7 | Countdown usa campos/header do servidor; limite local de 5 tentativas e 15 min; camada Firebase preserva o ApiFailure 429 e o prazo | Testes de login/bloqueio e regressão da fronteira de identidade; contrato HTTP no backend |
| M8 | Preferência persistente OFF por padrão e controle LGPD; inicialização e alteração aplicam coleta | Testes de preferência/analytics; Firebase real em dispositivo pendente |
| M9/C5 | Polling de 30 s removido; atualiza por evento, reconexão e retomada do app | Testes de eventos/provider, sem timer recorrente; serviço/socket real pendente |
| M10/C6 | Escolha Entrega/Retirada por unidade, payload preservado no resumo, dispensa de endereço aplicável, instrução/código sem mapa de entregador | Modelos/transporte e suíte; contrato backend de retirada testado; compra completa em dispositivo pendente |
| M11 | Permissão push contextual e registro apenas autorizado/provisional | Testes de preferências/permissões; APNs/FCM real pendente |
| M12 | Arquivos e membros mortos indicados já ausentes ou removidos anteriormente; referências verificadas | Analyze sem problemas e 190 testes |
| M13 | Gestão de cartões salvos/rota aposentada ausente; checkout continua com seleção de pagamento | Busca de referências e suíte |
| M14/C8 | SSE UTF-8 com eventos multiline, deltas progressivos, cancelamento/timeout e fallback somente antes do primeiro delta | Testes de stream/repositório/fallback; backend testa protocolo SSE separadamente |

### Chatbot e termos

| Item | Implementação/evidência | Validação e limites |
|---|---|---|
| C1 chatbot | Redação de nome/endereço identificados e e-mail/CPF/telefone; corrigidos sobrenomes minúsculos e acentos decompostos; preserva pedido culinário e detecção de instruções indevidas | Testes pt-BR/sanitização e Unicode incluídos nos 124 testes |
| C2 chatbot | Docs, redoc e OpenAPI desabilitados em produção | Testes de ambiente de produção/desenvolvimento |
| C3 chatbot | README/env com origens vazias, identidade para rate limit e AI_UNSAFE_INPUT; arquivo vazio aposentado | Ruff e pytest passaram; documentação existente conferida |
| B14/C8 compartilhado | Texto redigido antes do envio e protocolo delta/error/done compatível | Testes de ambos os serviços com mocks de protocolo; Groq real não utilizado |
| T1 | `documentTitle.js` e efeito em App atualizam título conforme documento; implementação remota integrada e casos adicionais testados | 6 testes e build; conteúdo jurídico não alterado |

### Infraestrutura e CI

| Item | Implementação/evidência | Validação e limites |
|---|---|---|
| I1 | Compose usa variáveis/secrets; exemplos sem segredos reais; `.env` ignorado | Compose normal e escala validados com valores efêmeros |
| C9 | Chaves de criptografia/hash, metrics e timeout propagadas em exemplos/Compose/Render/CI; produção valida configuração | Testes de runtime; chaves de CI aleatórias; configuração remota não alterada |
| B12/I4 | Prometheus usa credencial por arquivo/secret, API requer token | Endpoint testado; daemon Docker indisponível para scrape local real |
| C10 | Alertas existentes e de fila/falhas/rate limit/CPU/memória | 12 expressões parseadas; labels/alertas contra Prometheus vivo ainda pendentes |
| I2 | Jobs Docker de backend/web, publicação GHCR condicionada a main/tags e artefatos de build | YAML revisado; workflow remoto/imagens/artefatos não executados nesta revisão sem commit/push |
| I3 | k6 sobre banco isolado e contas por VU; Cypress com readiness e API stubada | Execução local registrada; job remoto ainda pendente |
| I4 | Grupos `meatshop-api-staging` e `meatshop-api-production` separados, develop/main, segredos sync:false e cookies seguros | Configuração revisada; deploy/preview e configuração de contas Render pendentes |
| Auditoria | npm audit de todas as dependências bloqueia altas/críticas; CodeQL e verificações de segurança existentes | Audit local sem altas/críticas; execução remota CodeQL pendente |

## Contratos entre repositórios

| Contrato | Alinhamento implementado | Evidência local |
|---|---|---|
| B7 ↔ M7 | Campos JSON/header e countdown | HTTP backend e testes mobile |
| B10 ↔ W4 | Cookie/header CSRF, CORS, retry único | Testes de API e cliente web |
| B11 ↔ clientes | Header mobile e corpo com tokens; web cookies | Login HTTP e transport/clientes |
| B12 ↔ infraestrutura | Bearer e secret de scrape | Endpoint autorizado/negado e configuração |
| B14 ↔ chatbot | Sanitização antes de persistir/enviar e antes da Groq | Testes de redação/protocolo nos dois lados |
| B5 ↔ C7 web | Status da unidade e restrição pública | API e configurações web |
| C4 ↔ interfaces | Campo opcional e autorização | DTO/banco/API, widgets/modelos e render web |
| C5 ↔ M9 | Namespace, nome e `{orderId}` | Trigger/dispatcher, socket e provider |
| C6 ↔ M10 | PICKUP por unidade, taxa/endereço/código | Contrato de checkout e modelos/transport mobile |
| C8 ↔ M14 | SSE delta/error/done e fallback | Parsing e stream backend/mobile/chatbot |
| B17/W9 ↔ CI | Cenários e specs chamados pelos jobs | Testes locais e workflow revisado |

## Homologação ainda necessária

1. Executar os fluxos de retirada, suporte, histórico, bloqueio, analytics, push, ganhos e IA em emulador/dispositivo com API de homologação.
2. Fazer auditoria visual completa de contraste WCAG AA, navegação por teclado e leitor de tela nas telas indicadas; a inspeção local foi pontual.
3. Subir Docker/Prometheus e validar scrape autenticado, regras disparando contra métricas reais e imagens finais.
4. Executar CI remota e conferir artefatos/GHCR/CodeQL; verificar segredos independentes, cookies e deploys Render em develop/main.
5. Validar Mercado Pago sandbox, Firebase, envio de e-mail e Groq com credenciais de homologação. Os testes desta revisão usaram mocks onde há provedores externos.
6. Definir o ambiente de referência do pico de 500 VUs e resolver o p95 do carrinho acima de 1 s antes de declarar B17 concluído. A reprovação está preservada nos logs e nos critérios da CI.

Preservados os arquivos não rastreados que já existiam no workspace antes da revisão. Esses arquivos preexistentes ficam fora dos commits desta revisão. Commits e push das alterações revisadas foram autorizados posteriormente pelo usuário; B17 permanece pendente.
