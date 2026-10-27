# Implementação dos 18 pontos — 3.3.0/functional-gaps

Data: 23/10/2026. Repositórios: backend/web e `meatshop-mobile`, ambos na branch `3.3.0/functional-gaps`. O código do chatbot não foi alterado.

## Entregas e evidências

| Ponto | Implementação ou decisão | Verificação |
| --- | --- | --- |
| 1. Senha mobile | Política compartilhada: 8–64 caracteres, maiúscula, minúscula, número e caractere especial; cadastro e troca usam a mesma validação. | Testes Flutter da política e análise estática. |
| 2. Bloqueio central | Login web e validação da senha mobile compartilham contagem no PostgreSQL; cinco falhas bloqueiam por 15 minutos, inclusive entre instâncias. Indisponibilidade do provedor não conta como senha errada. | Integração concorrente com provedor simulado; bloqueio antes de nova chamada ao Firebase. |
| 3. Catálogo público | Oculta produto/categoria inativos e estoque indisponível, inclusive quando a URL solicita `available=false`. Gestão autenticada possui rotas próprias e autorização por unidade. | Testes de controller, caso de uso e integração HTTP com acesso permitido/negado. |
| 4. Repetição de compra | Carrinho, cotação, checkout e repetição usam critérios consistentes de disponibilidade e quantidade. Categoria desativada impede recompra. Comparação de estoque numérico corrigida. | Testes de política, estoque e repetição com categoria desativada. |
| 5. Localização manual | Busca por cidade e/ou região sem exigir GPS, com limpeza dos filtros ao trocar o modo. Cidade aceita variação de acento/caixa. | Testes do provider Flutter e integração PostgreSQL. |
| 6. Central de suporte mobile | Listar/abrir chamado, consultar conversa, responder, encerrar e reabrir; paginação, carregamento, erro e preservação de rascunho. | Contratos HTTP, teste de erro/reenvio e isolamento de conversa entre usuários. |
| 7. Auditoria durável | Intenção persistida antes da operação HTTP; alterações de tabelas críticas auditadas por trigger na mesma transação. Falha ao inserir auditoria impede a alteração. | Regressão do interceptor e teste de rollback com restrição que rejeita a auditoria. |
| 8. Auditoria fora do HTTP | Triggers abrangem alterações de usuários, unidades, produtos/estoque, pedidos, pagamentos, suporte, despesas e demais tabelas listadas na migração. HTTP propaga ator/correlação; tarefas sem usuário são `SYSTEM`. | Integração de ator autenticado e alteração direta no banco. |
| 9. Paginação SQL | Busca combinada conta resultados e aplica offset/limite em cada fonte, preservando ordenação e total. | Teste de página atravessando categorias e produtos; integração de busca. |
| 10. CI | Banco isolado migrado antes dos testes de gaps, especificação e smoke; resultados de desempenho publicados como artefato. | Workflow atualizado; suítes executadas localmente. Execução remota depende de futuro push/PR. |
| 11. Jornadas e desempenho | Script concorrente de busca, inclusão/alteração de carrinho, cotação, checkout e cancelamento; mede p95 e máximo. Exige contas dedicadas e autorização explícita para mutações. | Duas contas e três iterações por conta em integração, com estoque restaurado ao fim. |
| 12. Proteção dos registros | Proteção existente contra UPDATE/DELETE preservada; acrescentada proteção contra TRUNCATE. Logs redigem credenciais inclusive campos aninhados/camelCase. | Testes de DELETE, TRUNCATE e sanitização. A proteção anterior já existia e foi subestimada na auditoria inicial. |
| 13. Alertas | Prometheus → Alertmanager → endpoint autenticado → notificações de administradores no painel, sem push. | Testes de autenticação e envio somente a administradores ativos com `push:false`. |
| 14. Pedido e pagamento | Mantida separação entre estado operacional e liquidação: pagamento na entrega pode estar pendente; total zero não exige cobrança; receita depende de recebimento confirmado. | Política de pagamento e integrações financeiras existentes. |
| 15. Multi-cloud | Retirada do escopo a substituição de Firebase Auth/FCM. Backend/web/PostgreSQL permanecem containerizados. | Decisão de escopo; não representa implementação de outro provedor de identidade/push. |
| 16. Despesas do entregador | Cadastro, edição, exclusão, categorias, data, descrição, valor, período, paginação e total do período; usuário só acessa os próprios registros. | Integração CRUD/isolamento/validação; contratos e formulários Flutter. |
| 17. Dados pessoais | Exportação autenticada dos próprios dados no web/mobile; política consultável; limpeza diária de sessões expiradas, segredos de recuperação vencidos e tentativas antigas. Descrição de despesas anonimizada na exclusão da conta. | Exportação sem dados de outro usuário/segredos; teste de retenção preservando bloqueios ativos e pedidos. |
| 18. Múltiplas instâncias | Socket.IO com adaptador PostgreSQL, bloqueios centrais, exclusão mútua da retenção e override Compose com duas réplicas/gateway. | Evento de sala entre dois servidores reais; validação do Compose. Cluster de produção não foi implantado. |

## Configuração

- Aplicar a migração `1792790400000-CompleteFunctionalGaps` pelo fluxo habitual; a cadeia possui 60 migrações. Fazer backup antes de aplicar em produção.
- Configurar `FIREBASE_WEB_API_KEY` com a chave pública do mesmo projeto Firebase usado pelo aplicativo. O endpoint `/auth/mobile/password` valida a senha; o SDK continua estabelecendo a sessão do Firebase. Google/Apple mantêm seus fluxos.
- `AUTH_ATTEMPTS_RETENTION_DAYS=30` controla a retenção das tentativas expiradas. Bloqueios ainda ativos são preservados.
- `SOCKET_IO_SHARED=false` é suficiente para uma instância. Para réplicas, ativar `true`. A validação de runtime rejeita `BACKEND_REPLICAS>1` sem adaptador compartilhado.
- Na raiz, `node scripts/setup-observability.mjs` prepara o segredo local de monitoramento sem exibi-lo. `.env` e `secrets/monitoring-token.txt` não são versionados.
- Ativar monitoramento: `docker compose --profile observability up -d prometheus alertmanager`. Os alertas chegam à caixa de notificações do superadministrador. Não há canal externo. Enquanto a API estiver indisponível, a entrega ao painel depende da recuperação da API.
- Modo local com réplicas: `docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d --build`. O gateway mantém afinidade de conexão. O teste com dois servidores não substitui homologação de balanceamento em produção. Referência: [adaptador PostgreSQL do Socket.IO](https://socket.io/docs/v4/postgres-adapter/).

## Onde testar nas interfaces

1. Mobile: cadastro e troca de senha; após recompilar o aplicativo, testar também login por senha usando o backend atualizado.
2. Mobile: seletor de localização → buscar por cidade ou região → Anápolis/GO; alternar para GPS e verificar limpeza do filtro manual.
3. Mobile: configurações → Meus chamados → abrir, responder, encerrar e reabrir; provocar erro de conexão e confirmar preservação do texto.
4. Mobile, perfil de entregador: gestão pessoal → Minhas despesas → cadastrar, editar, excluir e mudar período; conferir total e valores inválidos.
5. Mobile: configurações → Exportar meus dados → escolher destino no compartilhamento do sistema.
6. Web: configurações da conta → exportar dados → abrir JSON baixado e conferir somente os dados da conta autenticada.
7. Web: gestão de produtos deve continuar exibindo produto desativado para edição; mobile/catálogo público devem ocultá-lo.
8. Compra mobile: adicionar produto, alterar quantidade, cotar, concluir e cancelar; desativar categoria na gestão e repetir compra anterior para verificar indisponibilidade.
9. Painel superadministrador: conferir notificações técnicas quando uma regra real de monitoramento disparar. O endpoint exige segredo; não publicar esse segredo no navegador.

Os novos formulários Flutter foram testados também com largura de 320 px, fonte ampliada e teclado aberto; os botões compartilhados aceitam quebra de linha sem altura fixa inadequada.

## Reprodução automatizada

Backend: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`. Web: comandos equivalentes, usando `npm run test` conforme o package.json. Mobile: `flutter pub get`, `flutter analyze`, `flutter test`.

Integrações devem usar bancos dedicados, nunca o banco de desenvolvimento com dados pessoais. Para a suíte de especificação, criar e migrar `meatshop_spec_test_330` e definir `E2E_TEST_DATABASE=meatshop_spec_test_330`. Executar `npm run test:e2e -- specification`. Porta padrão local: 5433; CI define `E2E_DB_PORT=5432`.

Para toda a suíte, os bancos dedicados de gaps, geolocalização, pagamentos e jurídico também precisam estar preparados; o banco jurídico deve iniciar vazio. As variáveis de habilitação estão nos respectivos arquivos `test/*.e2e-spec.ts`. Os guards recusam nomes de bancos não autorizados.

O script `scripts/performance-journeys.mjs` exige `PERF_ALLOW_MUTATIONS=true`, `PERF_BASE_URL` e `PERF_ACCOUNTS` (JSON de contas distintas com token e productId). Ele cria e cancela pedidos reais no ambiente informado: usar somente contas/estoques dedicados. Nunca salvar tokens em relatórios ou commits. Resultado da execução de integração: `meatshop-backend/test-results/specification-performance.json`.

## Limites da conclusão

Validação local: **286 testes unitários do backend, 28 do web, 183 do mobile e 64 de integração aprovados**. Análises estáticas e builds web/backend aprovados; todas as 60 migrações aplicadas a um banco vazio isolado. Auditorias npm de dependências de produção sem vulnerabilidades na verificação desta etapa. Esses resultados não abrangem automaticamente dependências exclusivas de desenvolvimento.

Ambiente local atualizado: web responde em `http://localhost:3000`, API em `http://localhost:3001/health`; banco da aplicação com 60 migrações. Prometheus identifica o backend como `up`, sem erro de coleta. Promtool aprovou as sete regras; amtool aprovou o receptor. Conta web conferida em navegador real com larguras de 1440 e 390 px, sem rolagem horizontal; exportação autenticada respondeu 200 nas duas resoluções. Capturas locais em `%TEMP%/meatshop-gaps-web-review/account-desktop.png` e `account-mobile.png`.

Na jornada concorrente local, p95 observado: busca 62 ms, carrinho 203 ms e checkout 230 ms, dentro dos orçamentos configurados. A amostra usa duas contas e seis checkouts; serve como regressão reproduzível, não como certificação de capacidade de produção.

- A aprovação local não comprova disponibilidade mensal, carga de produção, latência em rede móvel real, acessibilidade integral ou homologação em aparelhos Android/iOS.
- A contagem central protege os endpoints da aplicação. Tentativas feitas diretamente contra serviços externos do Firebase seguem as políticas do próprio provedor; configurar e verificar a política de senha no projeto Firebase em produção.
- Pedidos, pagamentos, valores de despesas e auditoria permanecem preservados. Conteúdo histórico de suporte não recebeu expurgo automático geral; o prazo deve seguir política de retenção documentada. IA e rastreamento mantêm suas políticas específicas configuráveis.
- Bloqueios append-only protegem contra operações comuns da aplicação; privilégios administrativos do banco e backups exigem controle operacional próprio.
- O roteiro de homologação, primeiro web e depois mobile, está em [ROTEIRO_HOMOLOGACAO_GAPS_330.md](ROTEIRO_HOMOLOGACAO_GAPS_330.md).
