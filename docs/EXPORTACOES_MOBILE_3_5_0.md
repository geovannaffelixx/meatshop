# Exportações pessoais do entregador — mobile 3.5.0

## Escopo e acesso

O recurso existe somente no perfil ativo de entregador do aplicativo. O perfil de cliente não apresenta exportação. O backend exige conta ativa, app_profile DELIVERY/BOTH e cadastro de entregador correspondente ao usuário autenticado. Não exige vínculo OWNER/MANAGER e não aceita usuário, entregador ou unidade na query.

A rota administrativa do web e a exportação pessoal administrativa mantêm as regras anteriores. A rota pessoal do entregador é independente: `GET /delivery/me/exports`.

## Contrato

| Campo | Valores/regra |
| --- | --- |
| report | earnings, history, expenses, financial, settlements, personal, support |
| format | xlsx ou pdf; JSON/CSV recusados |
| from/to | Datas YYYY-MM-DD, obrigatórias exceto em personal; fim inclusivo no calendário America/Sao_Paulo |
| payment | all, received, pending; somente ganhos e histórico |
| category | Categoria existente da despesa; somente despesas |
| status | Situação existente do chamado; somente atendimento |

`personal` não aceita filtros de período e preserva a cópia completa dos dados da própria conta, incluindo suas atividades como cliente se o usuário tiver os dois perfis. A opção de iniciar uma exportação pelo perfil de cliente não existe.

Filtros desconhecidos são recusados pelo ValidationPipe. Identificadores são derivados da sessão e do cadastro do entregador. Não há seleção de unidade; todas as consultas operacionais usam delivery_person_id ou user_id da própria conta.

## Relatórios e cálculos

- Ganhos/histórico: entregas com delivery_status DELIVERED; data de conclusão usa delivery_verified_at, com updated_at como alternativa para registros antigos. Exibe taxa, recebido, saldo e data do acerto. Valores recebidos desses pedidos refletem o estado na emissão, mesmo quando o pagamento foi feito fora do período de conclusão.
- Acertos: valores efetivamente registrados em delivery_settlements, filtrados pela data paid_at.
- Despesas: registros pessoais em delivery_expenses, filtrados por incurred_on e categoria.
- Demonstrativo: ganhos pela conclusão, recebimentos pela data do acerto, despesas pela data informada; resultado de caixa = recebimentos menos despesas do período. Um pagamento de entrega antiga pode entrar no caixa atual.
- Atendimento: somente chamados com user_id da sessão e suas mensagens. O período corresponde à abertura do chamado; mensagens desses chamados são incluídas até a emissão. Anexos não são empacotados.
- Dados pessoais: reutiliza a coleta e a remoção de credenciais do exportador existente. Os campos são apresentados em seções legíveis, com identificação pessoal e sem unidade fictícia.

Cálculos monetários de resumo usam centavos. Detalhes e resumo são lidos na mesma transação REPEATABLE READ. Limites: 10 mil linhas por seção e 10 mil campos na cópia pessoal. Resultados maiores retornam EXPORT_TOO_LARGE, sem truncamento silencioso. Não há novas tabelas ou migrations.

## Arquitetura e interface

```mermaid
flowchart LR
  Perfil[Perfil de entregador] --> Modal[Modal compartilhado]
  Modal --> Repositorio[DeliveryExportRepository]
  Repositorio --> HTTP[ApiClient e transporte binário]
  HTTP --> Endpoint[GET delivery/me/exports]
  Endpoint --> Acesso[Sessão e perfil de entregador]
  Acesso --> Dados[Consultas pessoais e cálculos]
  Dados --> Arquivo[ExcelJS ou PDFKit]
  Arquivo --> Compartilhar[Compartilhamento nativo]
```

Os renderizadores existentes agora aceitam identificação de unidade ou de pessoa; relatórios web continuam mostrando a unidade. A API gera o arquivo em memória, com Cache-Control: no-store, e registra sucesso/falha na auditoria sem unidade associada.

Atalhos no aplicativo:

1. Gestão pessoal → Relatórios → Exportar relatório: todos os tipos, período e filtros disponíveis.
2. Minhas despesas → Exportar: abre com o mês da tela.
3. Configurações → Exportar meus dados: abre a cópia pessoal apenas no perfil de entregador.

O aplicativo não recalcula o conteúdo dos arquivos. O cliente HTTP preserva Bearer, App Check existente, renovação de sessão, timeout e cancelamento para respostas binárias. Erros HTTP continuam sendo interpretados como JSON e traduzidos pelos códigos da API. O repositório verifica a assinatura básica PDF/ZIP antes de encaminhar o arquivo ao compartilhamento.

O controlador impede duplicação, cancela ao fechar e verifica novamente a conta e o perfil antes de compartilhar. A opção de salvar é fornecida pelo compartilhamento do sistema e depende dos aplicativos instalados. Cancelar a folha de compartilhamento não é informado como arquivo salvo. Os antigos geradores locais PDF/CSV e o serviço JSON foram substituídos; não há novas dependências de execução do mobile.

## Validação e execução

- Backend: build, typecheck e lint aprovados; 99 suítes e 1.392 testes passaram, incluindo autorização/HTTP, SQL em PostgreSQL isolado e regressões dos relatórios web.
- Mobile: flutter analyze sem apontamentos e 300 testes aprovados, incluindo layout em 320 px, erros, duplicação, troca de sessão/perfil e download binário com refresh.
- APK Android debug compilado em `meatshop-mobile/build/app/outputs/flutter-apk/app-debug.apk`, apontando para a API no emulador. O compartilhamento nativo ainda deve ser conferido em aparelho; não foi feita compilação iOS neste ambiente Windows.
- Compose validado com frontend, backend e PostgreSQL saudáveis; migrator concluído sem pendências. Swagger expõe a nova rota, que retorna 401 sem autenticação.
- A API local deve ser reconstruída para incluir a nova rota. O Compose executa o migrator antes do backend e preserva os volumes.
- Emulador Android: `--dart-define=MEATSHOP_ENV=development --dart-define=MEATSHOP_API_URL=http://10.0.2.2:3001`.
- Aparelho físico: usar o IP da máquina na mesma rede, com a porta 3001 acessível.

A versão do mobile é 3.5.0+3. O backend permanece 3.5.0. Nenhum commit ou publicação é realizado automaticamente.
