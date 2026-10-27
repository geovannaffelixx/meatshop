# Auditoria da especificação original — 3.3.0/functional-gaps

> Registro da auditoria inicial, anterior aos ajustes desta etapa. O resultado atualizado dos 18 pontos e as decisoes de escopo estao em [IMPLEMENTACAO_GAPS_330.md](IMPLEMENTACAO_GAPS_330.md). A protecao append-only contra UPDATE/DELETE ja existia na migracao 1787920000000; a implementacao atual amplia cobertura e protege TRUNCATE. As tabelas abaixo preservam o diagnostico historico, nao o estado atual.

Data: 23/10/2026. Escopo: backend NestJS, painel Next.js, aplicativo Flutter e integração com o chatbot Python.

**Conclusão: ainda não podemos declarar que toda a especificação original foi atendida.** Os principais fluxos existem, e a branch fecha lacunas importantes de busca, agendamento, notificações e relatórios. Permanecem divergências de implementação, decisões de negócio diferentes do documento e requisitos operacionais sem comprovação.

## Base e critério

- Documento fornecido: `Meatshop - Documento de Especificação do Projeto Integrador.docx (4).pdf`, 95 páginas. As páginas abaixo são as páginas do PDF, contando a capa.
- Backend/web: commit `a3d61b9ea0ba15d259e371605ff25589e21fdf52`.
- Mobile: commit `d5bd4e077166f43086fc407af9d352926469dcdc`.
- Comparação com as referências locais `develop`, usando `git diff develop...HEAD`. Não foi feito fetch; isto não atesta que essas referências sejam a versão mais recente do servidor.
- Foram examinados os 49 itens numerados: 13 RF, 13 RNF e 23 RNE, além de compromissos de arquitetura, segurança e cronograma fora das tabelas.
- O painel web é a interface de gestão; a compra do cliente e a operação do entregador estão no mobile. Não considerei ausência de carrinho no painel como defeito: essa distribuição de responsabilidades aparece no próprio documento.
- O status “Pronto” escrito no PDF não foi usado como prova. Arquivo de teste existente também não equivale, sozinho, a cenário aprovado em produção.
- Esta auditoria não altera regras de negócio, contas, pedidos nem configuração de serviços externos.

Legenda:

| Estado | Significado |
| --- | --- |
| C | Implementação consistente com o requisito no código examinado. Não significa homologação completa de cada combinação de tela, aparelho e ambiente. |
| P | Parcial ou divergente: há uma diferença concreta entre o compromisso e a implementação examinada. |
| H | Há implementação ou preparação, mas falta evidência operacional, configuração ou homologação para fechar o requisito. |

| Grupo | C | P | H | Total |
| --- | ---: | ---: | ---: | ---: |
| Funcionais | 6 | 4 | 3 | 13 |
| Não funcionais | 2 | 4 | 7 | 13 |
| Regras de negócio | 11 | 9 | 3 | 23 |
| Total | 19 | 17 | 13 | 49 |

Os itens se sobrepõem: a senha mobile afeta RF001 e RNE002, por exemplo. Esses números não são percentual de conclusão do projeto nem quantidade de bugs distintos.

## Requisitos funcionais

As referências B, W, M, I e T apontam para o índice de evidências ao final.

| ID / PDF | Compromisso | Estado | Evidência e pendência |
| --- | --- | :---: | --- |
| RF001 / p25 | Cadastro/login seguro, e-mail único, senha ou Google/Apple | P | B01/B02, M01 e W01: JWT, refresh, Firebase exchange e vinculação social existem. Cadastro e troca de senha mobile validam somente 6 caracteres; a regra original exige 8. Google/Apple precisam de homologação real nas plataformas. |
| RF002 / p26 | Catálogo atualizado com nome, descrição, preço e categoria | P | B03/M02: mobile usa catálogo disponível e API compartilhada. Porém `GET /products` público sem filtro retorna inativos/sem estoque, e `GET /products/:id` não impõe disponibilidade. Reprodução local descrita em A02. |
| RF003 / p26 | Adicionar/remover/alterar quantidade; atualizar total e itens | C | B04 e M03: carrinho persistido, política de produto/quantidade/estoque e atualização do provider; testes de carrinho e quantidade existentes. |
| RF004 / p26 | Checkout, crédito/débito/Pix, resumo e confirmação/falha | H | B05/M04/T02: Checkout Pro, webhook, estados, recuperação e testes com provedor simulado. Ambiente atual com `PAYMENTS_ENABLED=false`; compra real/sandbox completa ainda precisa ser comprovada. Ver também a divergência de confirmação RNE007. |
| RF005 / p26–27 | Busca parcial e combinação de nome/categoria/preço/marca | C | B06/M05/T01: SQL combina filtros, exige produto/categoria ativos e estoque positivo; mobile fornece filtros e trata respostas tardias. A paginação em memória precisa de avaliação de escala, RNF006. |
| RF006 / p27 | GPS autorizado, proximidade e alternativa por cidade/região | P | B07/M06: GPS opt-in, consulta por coordenadas/distância e alternativa por mapa/endereço salvo existem. Não encontrei entrada de cidade/região na descoberta; o seletor manual recebe coordenadas. Endereço com cidade não equivale ao filtro independente prometido. |
| RF007 / p27 | Agendar conforme dias, horários e capacidade | C | B08/W02/M02/T01: disponibilidade consultada pelo mobile, capacidade por faixa, validação transacional e teste concorrente da última vaga. Painel salva horários e capacidade juntos. |
| RF008 / p27 | Push de promoções, atualizações e status autorizado | H | B09/M07: preferências persistidas, tokens por usuário, agendador de campanhas, notificações e FCM implementados. Falta homologar entrega real em Android/iOS, permissão negada/revogada e app em segundo plano. A entrega não é garantida pelos testes com mocks. |
| RF009 / p28 | Histórico detalhado e repetir com disponibilidade/preços atuais | P | B10/M04: histórico e repetição usam preços atuais; existe tratamento de itens sem estoque/inativos. Porém repetição não consulta categoria ativa, ao contrário da política normal de inclusão. Pode recolocar item de categoria desativada no carrinho; checkout rejeita depois. A07. |
| RF010 / p28 | Painel protegido: produtos, pedidos, promoções e relatórios | C | B11/W03: perfis e permissões por unidade, gestão de produtos/status/promoções e relatórios persistidos. Testes específicos de relatórios, horários e pagamentos existentes. |
| RF011 / p28 | Avaliar produto/açougue com nota/comentário após compra | C | B12/M08: exige pedido do cliente em `DELIVERED`; produto deve estar no pedido; avaliação vinculada ao pedido e proteção contra duplicação. |
| RF012 / p29 | Canal de dúvidas e pós-venda com assunto/descrição/contato | C | B13/W04/M09: chamados com assunto/descrição no backend/painel e chat de pedidos no mobile fornecem canais de atendimento. O suporte da plataforma no mobile abre e-mail externo, sem integração com os chamados; essa lacuna de registro é tratada em RNE016/A09. |
| RF013 / p29 | IA culinária, respostas compreensíveis e falhas seguras | H | B14/M10/I01: integração, histórico, limites, mensagens de indisponibilidade, filtro temático e testes existem. Chave Groq presente no container; não foi feita nesta auditoria uma conversa real autenticada de ponta a ponta pelo aplicativo. |

## Requisitos não funcionais

| ID / PDF | Compromisso | Estado | Evidência e pendência |
| --- | --- | :---: | --- |
| RNF001 / p29 | Funcionamento em Android, iOS e navegadores principais | H | Flutter e Next.js implementados; CI mobile prevê APK, emulador Android e build iOS. Testes de widgets e revisão web anterior existem. Falta matriz executada de aparelhos/versões/navegadores e teste físico iOS/Android; build iOS sem assinatura não é homologação funcional. |
| RNF002 / p30 | Persistência segura e preservação em falha/reinício | H | PostgreSQL, volume, migrations e transações em B05/O01. Falta comprovar backup restaurável, recuperação de desastre e proteção em repouso do PostgreSQL em ambiente alvo. Volume persistente não é backup. |
| RNF003 / p30 | Busca ≤5s, carrinho ≤1s, checkout ≤3s | H | Existe smoke sequencial O02, por padrão apenas `/health`. Não mede essas três jornadas nem concorrência representativa. Resultados históricos de k6 no PDF não demonstram o comportamento desta versão. |
| RNF004 / p30 | Páginas/ações principais ≤2s em conexão 4G | H | Não encontrei ensaio reproduzível com rede 4G simulada/real e orçamento por jornada. Captura responsiva e healthcheck não fecham esse requisito. |
| RNF005 / p30–31 | Disponibilidade mensal 99,5%, recuperação e redundância | H | Healthchecks/restart e regras de monitoramento em O01/O03. Falta série temporal mensal, redundância implantada, failover e exercício de recuperação. O próprio PDF p56 declara produção ainda futura. |
| RNF006 / p31 | Escalar sem perda de desempenho, distribuição de carga | P | Arquitetura modular e containers ajudam; faltam evidências de balanceamento/replicação e carga. B06 carrega todos os resultados e só depois faz `slice`, logo o limite da página não limita leitura SQL/memória. Uploads/estado e canais em tempo real também precisam de avaliação antes de múltiplas instâncias. |
| RNF007 / p31 | Operações principais ≤7s em condições normais | H | Não foi estabelecida medição atual das jornadas que permita fechar esse teto. O timeout do cliente de IA é 45s, portanto IA também exige definir se entra na expressão “operações principais”. |
| RNF008 / p31 | Preservar pedidos em falhas de comunicação, recuperar/idempotência | C | B05/M04/T02: chave UUID, bloqueio transacional, replay, validação de conflito, recuperação por checkout e persistência mobile da tentativa. Não equivale a concluir pagamento sem confirmação do provedor. |
| RNF009 / p32 | Código modular, documentado e versionado | C | Backend com módulos/DTOs/casos de uso; web com módulos/componentes; mobile com repositories/providers/UI; lint, tipagem e testes de arquitetura/CI. Não se trata de certificado de uniformidade de todas as telas/arquivos. |
| RNF010 / p32 | Logs de ações críticas protegidos contra alteração | P | B15/W05: trilha com ator, data, resultado e sanitização existe. Gravação usa `safeRecord` depois da operação e engole falha; mutação pode concluir sem trilha. Não encontrei mecanismo de armazenamento imutável/antiviolação comprovado para os registros. A05. |
| RNF011 / p32 | Métricas em tempo real e alertas automáticos | P | O03: métricas e regras de alertas versionadas; perfil de observabilidade opcional. `prometheus.yml` não configura destino Alertmanager; Compose não possui Alertmanager/receiver. Não demonstrado envio de alerta para responsável, nem dashboard/monitoramento completo do ambiente publicado. |
| RNF012 / p33 | Dev/homologação/produção e portabilidade entre clouds | P | O01/O04: execução local conteinerizada e roteiro de produção. Não comprovados ambientes separados/segundo provedor. Mobile exige Firebase Auth, push exige FCM; não existe alternativa de identidade/push configurável para saída desse provedor. Distinguir portabilidade do backend da independência de todos os serviços. |
| RNF013 / p33 | Groq por HTTPS, chave no servidor e mínimo de dados pessoais | H | I01: URL Groq HTTPS, chave server-side, sanitização de histórico/entrada e testes de segurança; B14 autentica/restringe o acesso. Comunicação interna Compose usa HTTP na rede local; faltam evidências TLS do ambiente publicado e homologação dos fluxos/dados enviados. A presença da variável não comprova proteção operacional de segredos. |

## Regras de negócio

| ID / PDF | Compromisso | Estado | Evidência e pendência |
| --- | --- | :---: | --- |
| RNE001 / p20 | E-mail exclusivo por conta ativa | C | B01/B02: normalização, consulta de duplicidade, unicidade no banco e identidade Firebase. Exclusão anonimiza o e-mail antigo. |
| RNE002 / p20 | Senha ≥8, maiúscula/minúscula/número/especial, hash seguro | P | B01 impõe 8 e complexidade. M01 cadastro/troca exigem somente 6. Firebase é chamado diretamente; a senha mobile não passa pelo DTO de senha NestJS. Política externa do Firebase não foi atestada. A01. |
| RNE003 / p20 | Bloqueio da conta após 5 tentativas inválidas consecutivas | P | B02 implementa 5/15min no login próprio; mobile M01 conta no armazenamento seguro local. Falhas de senha Firebase não incrementam o contador NestJS. Exchange respeita `locked_until` já existente, mas não centraliza essas falhas. Não fecha bloqueio por conta entre aparelhos. A03. |
| RNE004 / p20 | Exibir e permitir comprar somente produto ativo/com estoque | P | B04 protege inclusão normal e B05 protege checkout; B03/M02 filtram o catálogo mobile. Porém endpoints públicos sem filtro/detalhe permitem consultar inativos/zerados; repetição tem diferença de categoria. A02/A07. |
| RNE005 / p21 | Usar preço vigente na confirmação e atualizar preço alterado | C | B05: recálculo a partir dos produtos, quote/token/hash e `expected_total`; mudança retorna `QUOTE_CHANGED`, sem aceitar silenciosamente o preço antigo. |
| RNE006 / p21 | Validar estoque antes de finalizar; impedir quantidade excessiva | C | B04/B05: validação de quantidade e bloqueio pessimista de estoque na transação antes de decremento/criação efetiva. |
| RNE007 / p21 | Confirmar pedido somente após retorno positivo do provedor | P | B16 permite avançar pedido com pagamento `PENDING` se dinheiro/cartão na entrega; B05 também confirma total zero sem provedor. Isso é uma regra diferente da redação original. Não remover pagamento na entrega sem decisão de negócio; formalizar exceções ou ajustar implementação. A04. |
| RNE008 / p21 | Persistir itens, valores, pagamento, data e estado do pedido | C | B05: Order/OrderItem/Payment/histórico salvos em transação, com snapshots de produto e endereço e preços históricos. |
| RNE009 / p22 | Filtros combináveis restringem progressivamente | C | B06/M05: condições SQL `AND`, correspondência parcial e filtros sem termo; testes unitários e de PostgreSQL. |
| RNE010 / p22 | Consentimento prévio GPS e opção manual cidade/região | P | M06 obtém localização após escolha do usuário e permite mapa/endereço salvo. Falta a alternativa textual específica do documento. Cidade no cadastro de endereço não é pesquisa livre de cidade/região. |
| RNE011 / p22 | Oferecer agendamento somente em horários/vagas disponíveis | C | B08/M02/W02/T01: grade por dia/horário/capacidade, interseção entre unidades, rejeição de indisponível e concorrência protegida. |
| RNE012 / p22 | Push apenas autorizado e vinculado a conta/dispositivo/evento | H | B09/M07: registro autenticado de tokens, permissão do SO e preferências. Falta teste real de concessão/revogação, logout/troca de conta e entrega em ambos os sistemas operacionais. |
| RNE013 / p22–23 | Pedidos finalizados não editáveis; consultar ou repetir | C | B17: estados terminais sem transição, bloqueio contra status antigo e repetição gera carrinho separado. Registros financeiros posteriores de recebimento/estorno são uma trilha própria e não edição de itens/preço histórico. Exclusão de dados pessoais pode limpar snapshots por finalidade de privacidade. |
| RNE014 / p23 | Gestão restrita a administrador/responsável autorizado | C | B11/W03: perfil, membership ativo e permissões por unidade; autorização também no backend. |
| RNE015 / p23 | Avaliações somente por comprador com pedido concluído | C | B12/M08: verifica dono, `DELIVERED`, produto contido no pedido e vínculo persistido. |
| RNE016 / p23 | Persistir suporte com usuário/data/descrição/status | P | B13/W04 persistem chamados/mensagens com propriedade e estados. Porém o contato de suporte em `legal_screen.dart` mobile abre `mailto:` externo, sem criar chamado; não encontrei consumo de `/support-tickets` no app. Esse caminho não garante o registro de toda interação exigido pela regra. A09. |
| RNE017 / p23–24 | Toda alteração sensível/crítica deve ter auditoria | P | B15: interceptor global e eventos específicos; porém `safeRecord` permite sucesso de negócio sem persistência do evento em falha. Interceptor HTTP não garante automaticamente cobertura de jobs/webhooks internos. Necessário inventário de cobertura e garantia durável. |
| RNE018 / p24 | Relatórios somente com dados confirmados/persistidos | C | B18/W03: financeiro consulta pagamentos `PAID`/`PARTIALLY_REFUNDED`, desconta estornos/taxas; gráficos usam pedidos persistidos. Contagem de pedidos pendentes é métrica operacional, não receita recebida. |
| RNE019 / p24 | Falha de rede preserva pendência até confirmar/cancelar | C | B05/B19/M04/T02: transação/idempotência/recuperação, expiração de pendências online e reconciliação; não depende da resposta HTTP inicial chegar ao cliente. |
| RNE020 / p24 | Não depender exclusivamente de recursos de uma cloud | P | O01 permite hospedar API/web/PostgreSQL fora do Google. Contudo Firebase Auth é obrigatório no mobile e FCM no push. Se a intenção é apenas hospedar containers em clouds diferentes, há base; se inclui substituir esses serviços, falta abstração/adaptador e prova de migração. A redação precisa definir o alcance. |
| RNE021 / p24–25 | Proteção, transparência, atualização/exclusão e consentimento | P | B20/M11/W06: documentos versionados, aceite, edição, exclusão/anomização, retenção de IA/rastreamento e autorização existem. Persistem senha fraca permitida no mobile, infraestrutura/TLS/backup sem comprovação e compromissos adicionais de direitos/retencão do p68 a concluir. Não é parecer jurídico de conformidade. |
| RNE022 / p25 | Indisponibilidade mensal ≤0,5% | H | Mesmo compromisso de RNF005: não há série mensal do ambiente publicado disponível nesta auditoria. Containers saudáveis agora não demonstram SLA mensal. |
| RNE023 / p25 | IA só carnes/cortes/receitas/preparo; recusar fora do tema | H | I01 contém filtro temático, prompt, proteção contra injeção e testes de recusa/contexto. Falta bateria real de homologação com modelo atual, contexto ambíguo e tentativas adversariais; filtro por código/prompt não prova restrição absoluta de toda resposta gerada. |

## Achados que precisam de ação

### A01 — Senha mobile diferente da especificação — prioridade alta

Em `register_screen.dart` e `change_password_screen.dart`, `_hasMinLength = value.length >= 6` e a mensagem é “Mínimo 6 caracteres”. `AuthService` chama `createUserWithEmailAndPassword`/`updatePassword` diretamente. Não existe validação equivalente de 8 caracteres nesse serviço.

Correção necessária: política compartilhada no mobile com mínimo 8 e todos os componentes exigidos; aplicar também à recuperação/troca conforme as possibilidades do provedor; conferir política efetiva do Firebase. Testar 6/7/8 caracteres e ausência de cada componente, incluindo tentativa fora da UI. Não criei contas fracas nem alterei credenciais para esta auditoria.

### A02 — Disponibilidade do catálogo é opcional na API pública — prioridade alta

Reprodução somente leitura no ambiente local:

```powershell
$catalogo = Invoke-RestMethod 'http://localhost:3001/products?limit=50'
$catalogo.data | Where-Object { -not $_.active -or [decimal]$_.stock_quantity -le 0 } |
  Select-Object id,name,active,stock_quantity
```

Resposta observada inclui produto 4 inativo e produto 2 com estoque zero, além das fixtures equivalentes. A listagem com `available=true` usa a consulta correta; o mobile já envia esse parâmetro. O detalhe público também carrega produto por ID sem política de disponibilidade.

Correção necessária: separar acesso administrativo autenticado do catálogo público, aplicar disponibilidade como regra do servidor e definir detalhe de produto indisponível. Testar sem parâmetros, com `active=false`/`available=false`, por ID e com categoria inativa. Não basta ocultar no app.

### A03 — Bloqueio mobile por aparelho, não por conta — prioridade alta

`LoginAttemptsService` persiste contador local por e-mail normalizado; não recebe eventos de falha de outros aparelhos. Falha de senha é retornada pelo Firebase antes do exchange. O backend respeita conta já bloqueada, mas seu contador cresce somente no seu fluxo de login por senha.

Correção necessária: definir mecanismo confiável de bloqueio por identidade e validar política do provedor. Não resolver com endpoint público que incremente contador sem autenticação/prova da falha. Testar tentativas distribuídas em dois aparelhos, reinício, expiração e acerto após falhas. A proteção local atual continua útil, mas é insuficiente para a redação da RNE003.

### A04 — Confirmação com pagamento na entrega — decisão de negócio pendente

`assertPaymentAllowsPreparation` aceita `PENDING` para métodos offline, e confirmação usa essa política. Pedido de total zero também nasce confirmado/pago sem retorno externo. Não são falhas acidentais de webhook: são comportamentos explícitos que divergem da frase “somente após retorno positivo do provedor”.

Ação: documentar exceções para pagamento na entrega/total zero, se essa for a decisão do produto, com estados e comprovante de recebimento. Se a regra original for mantida literalmente, esses fluxos precisam mudar. Testar online negado/pendente/aprovado, dinheiro, cartão na entrega e total zero com expectativas distintas.

### A05 — Auditoria sem garantia de persistência — prioridade média

`AuditTrailService.safeRecord` captura erro de gravação e apenas registra log. O interceptor executa a gravação depois da operação. Assim, há uma janela real em que o dado é alterado e a auditoria falha. Não encontrei prova de proteção contra adulteração por quem tem acesso de escrita ao banco.

Ação: estabelecer garantia transacional/outbox para ações críticas, cobertura explícita de tarefas automáticas e política de acesso/imutabilidade. Testar falha de persistência do evento e posterior recuperação, sem perder o evento crítico.

### A06 — Alertas e E2E não fecham automaticamente na CI — prioridade média

As regras Prometheus existem, mas falta receiver configurado para entrega dos alertas. A CI principal executa `test:e2e` sem `GAPS_TEST_DATABASE`/`E2E_TEST_DATABASE`; as suítes de gaps e smoke estão protegidas por essas variáveis e ficam puladas nesse job. Os 52 E2E executados na revisão anterior foram habilitados localmente de modo explícito.

Ação: preparar banco dedicado e habilitar essas suítes na CI; exigir evidência do número de testes executados, não apenas saída verde. Conectar Alertmanager/receiver e testar indisponibilidade e erro com aviso recebido. CI mobile prevê emulador e build iOS, mas não consultei o histórico remoto dos jobs nesta auditoria.

### A07 — Repetição de pedido não usa toda a política de disponibilidade — prioridade média

`RepeatOrderUseCase` verifica `product.active` e estoque, mas não carrega/verifica categoria ativa. `CartProductPolicyService` e checkout verificam categoria. Por inspeção, repetição pode inserir item que inclusão normal não aceita. Não reproduzi alterando categoria da massa de testes.

Ação: reutilizar uma política consistente na repetição, retornar itens ignorados e criar regressão para produto ativo com categoria inativa. Preço vigente já é utilizado.

### A08 — Desempenho, recuperação, plataformas e serviços reais — pendências de homologação

A suíte atual não substitui: carga concorrente de busca/carrinho/checkout, navegação em 4G, restauração de backup, operação mensal para 99,5%, testes físicos Android/iOS, pagamento Mercado Pago, recebimento FCM e login Google/Apple. Essas evidências precisam identificar versão, ambiente, dados, configuração, métricas e resultado.

### A09 — Suporte mobile não integrado à central de chamados — prioridade média

O painel consegue abrir e acompanhar chamados da API; o mobile tem chat com o açougue. Já o botão de suporte em `legal_screen.dart` abre um aplicativo de e-mail, sem persistir o contato em `/support-tickets`. Não encontrei repository/tela mobile para esses chamados. Portanto o canal de contato existe, mas a regra de registrar todas as interações não está garantida nesse percurso.

Ação: integrar abertura, consulta e respostas aos chamados no mobile ou estabelecer mecanismo de ingresso dos e-mails na central. Testar usuário comum, assunto/descrição, autoria, resposta, fechamento/reabertura e falha de rede sem perda do registro.

## Promessas fora das tabelas de RF/RNF/RNE

| Trecho do PDF | Situação encontrada | Ação necessária |
| --- | --- | --- |
| p11 e p16: entregador aceita entregas, acompanha renda e despesas | Aceite, disponibilidade, etapas/códigos, rastreamento e rendimentos têm implementação. A gestão pessoal tem ganhos/relatórios/metas; não localizei fluxo próprio de cadastro e apuração de despesas do entregador. Despesas da loja não substituem despesas do entregador. | Implementar o fluxo de despesas ou retirar/revisar esse compromisso de escopo. |
| p13–14: sincronização PostgreSQL ↔ Firebase/Firestore com gatilhos | A arquitetura atual usa backend/PostgreSQL como fonte operacional; mobile consome API/realtime e mantém Firebase para identidade/push. Há teste que impede novas dependências Firestore. | Atualizar a arquitetura e o cronograma no documento. Não recomendo introduzir uma segunda base operacional só para cumprir texto antigo; formalizar a substituição do mecanismo. |
| p56–57: primeiro deploy e checklist de produção | O PDF declara deploy ainda não realizado e prevê final de novembro de 2026. Docker, CI e roteiro existem; não foi apresentada evidência de produção publicada, TLS, LB, rede privada, backup/restore e rollback ensaiados. | Tratar como etapa futura e validar checklist no ambiente efetivo. Não é atraso comprovado na data desta auditoria, 23/10. |
| p68: acesso, correção, exclusão, portabilidade e informações do titular | Perfil/consulta/exclusão e aceites existem. Não localizei mecanismo específico de exportação de todos os dados do titular nem procedimento completo de atendimento/retencão global/incidente demonstrado. Retenção automática existe para IA e rastreamento. | Definir procedimento e responsabilidades; automatizar exportação se a decisão do produto exigir. Um atendimento manual pode atender um compromisso de solicitação, mas precisa estar documentado e testado. |
| p77–91, SEG05/06: JWT, cookies, autorização, senha e vinculação social | JWT/refresh, cookies HttpOnly, checagem de identidade Firebase, permissões e reautenticação social existem. Senha e bloqueio mobile têm as divergências A01/A03. | Corrigir os dois pontos e homologar login/link em aparelho real. |
| p85, SEG07: criptografia Firebase | Não comprova criptografia/backup/proteção da base PostgreSQL, onde estão os dados operacionais atuais. | Documentar proteção de ambos os serviços e comprovar configuração do ambiente alvo. |
| p86–88, SEG08: chave Groq/HTTPS/escopo culinário | Chave server-side, upstream HTTPS, filtros e sanitização implementados no chatbot; integração mobile passa pela API. | Validar configuração segura publicada e testes reais de domínio/recusa, sem prometer infalibilidade do modelo. |
| p88–89, SEG09: mascarar CPF/CNPJ/senhas/tokens | Sanitização estruturada e testes existem. Isso não prova que qualquer `debugPrint`, exceção de SDK ou log adicionado futuramente esteja sanitizado. | Fazer inspeção de logs reais dos cenários de falha e incluir verificação de regressão. |
| p89–91, SEG10: Checkout Pro, não armazenar PAN/CVV | Fluxo usa Checkout Pro; entidades de pagamento examinadas guardam método/status/IDs/valores, sem campo de PAN/CVV. | Homologar o fluxo real e manter dados de cartão fora de payloads/logs do projeto. |

Inconsistências do próprio PDF: RT07/RT08 relacionam segurança a RNF007, mas RNF007 na tabela é tempo de resposta; o cronograma chama multi-cloud de RNF13, mas a tabela define RNF012 como portabilidade e RNF013 como segurança Groq; RT12 é IA na matriz, enquanto o cronograma usa RT12 para métricas. RNE002 na tabela exige especial, mas o detalhamento lista menos componentes. Usar IDs e títulos corretos na revisão documental, sem transformar erros de referência em funcionalidades novas.

## Validação desta auditoria

- Reexecução em 23/10: backend **270 testes / 63 suítes aprovados**; web **26 testes / 11 suítes aprovados**; mobile **174 testes aprovados**. Executados `npm.cmd test -- --runInBand --silent` nos dois projetos Node e `flutter.bat test --reporter compact` no mobile. Esses comandos não reexecutam os E2E nem homologam serviços externos.
- Consulta HTTP pública de produtos, somente leitura: reproduziu A02.
- Containers backend, web, chatbot e PostgreSQL estavam saudáveis na consulta atual.
- Configuração observada sem revelar valores de segredos: pagamentos online desabilitados; SMTP não configurado; `FIREBASE_SERVICE_ACCOUNT`, variável lida pelo backend, ausente; chave Groq presente. A ausência da conta de serviço é uma pendência do setup FCM atual; credenciais alternativas e entrega efetiva não foram homologadas.
- Não houve transação real de pagamento, envio de campanha, criação de conta, alteração de senha nem modificação da massa Anápolis nesta auditoria.
- Evidência anterior, de 20/10, registrada em [REVISAO_GAPS_330.md](REVISAO_GAPS_330.md): 270 testes backend, 26 web, 174 mobile; 52 E2E com bancos isolados; 59 migrations a partir de banco vazio; builds/lint/análise e revisão visual das telas alteradas. Não confundir com uma nova execução integral desses checks hoje.

### Ordem sugerida para fechar a especificação

1. Corrigir senha mobile, catálogo público e repetição de pedidos; adicionar regressões específicas para os caminhos que escaparam das suítes atuais.
2. Resolver bloqueio de conta entre aparelhos e formalizar exceções de pagamento, alternativa de localização e alcance de multi-cloud.
3. Garantir trilha de auditoria durável, integrar suporte mobile à central, ligar alertas a destinatário e habilitar E2E de gaps na CI.
4. Homologar Mercado Pago, FCM, Google/Apple e IA pelos aplicativos reais.
5. Medir jornadas/carga/4G e validar backup/restore, plataformas, TLS e disponibilidade no ambiente publicado.
6. Revisar documentação para arquitetura atual, despesas do entregador e procedimentos de dados pessoais. Só então mudar os respectivos itens para concluídos.

## Índice de evidências no código

Links de diretório indicam os módulos; links de arquivo indicam os pontos principais examinados. Caminhos mobile/chatbot referem-se aos repositórios irmãos deste workspace.

| Ref. | Fontes |
| --- | --- |
| B01 | [RegisterDto](../meatshop-backend/src/auth/dto/register.dto.ts), [reset de senha](../meatshop-backend/src/auth/dto/reset-password.dto.ts), [registro](../meatshop-backend/src/auth/use-cases/register.use-case.ts), [User](../meatshop-backend/src/users/entities/user.entity.ts) |
| B02 | [Login](../meatshop-backend/src/auth/use-cases/login.use-case.ts), [Firebase exchange](../meatshop-backend/src/auth/use-cases/firebase-exchange.use-case.ts), [cookies](../meatshop-backend/src/auth/auth.controller.ts) |
| B03 | [ProductsController](../meatshop-backend/src/products/products.controller.ts), [listagem](../meatshop-backend/src/products/use-cases/list-products.use-case.ts), [detalhe](../meatshop-backend/src/products/use-cases/get-product.use-case.ts) |
| B04 | [Política de carrinho](../meatshop-backend/src/cart/services/cart-product-policy.service.ts), [casos de uso](../meatshop-backend/src/cart/use-cases) |
| B05 | [Checkout](../meatshop-backend/src/orders/use-cases/create-order.use-case.ts), [quote](../meatshop-backend/src/orders/services/checkout-quote.service.ts), [preço](../meatshop-backend/src/orders/services/checkout-pricing.service.ts), [pagamentos](../meatshop-backend/src/payments/providers/mercadopago.service.ts) |
| B06 | [Busca](../meatshop-backend/src/search/marketplace-search.service.ts), [testes](../meatshop-backend/src/search/marketplace-search.service.spec.ts) |
| B07 | [Unidades](../meatshop-backend/src/units), [E2E geolocalização](../meatshop-backend/test/geolocation.e2e-spec.ts) |
| B08 | [Disponibilidade](../meatshop-backend/src/orders/services/scheduling-availability.service.ts), [testes](../meatshop-backend/src/orders/services/scheduling-availability.service.spec.ts), [horários](../meatshop-backend/src/units/use-cases/set-business-hours.use-case.ts) |
| B09 | [Envio](../meatshop-backend/src/notifications/use-cases/send-notification.use-case.ts), [campanhas](../meatshop-backend/src/notifications/use-cases/send-promotion-notification.use-case.ts), [preferências](../meatshop-backend/src/notifications/use-cases/manage-notification-preferences.use-case.ts), [FCM](../meatshop-backend/src/notifications/providers/fcm.service.ts) |
| B10 | [Histórico](../meatshop-backend/src/orders/use-cases/list-order-history.use-case.ts), [repetição](../meatshop-backend/src/orders/use-cases/repeat-order.use-case.ts) |
| B11 | [Contexto do painel](../meatshop-backend/src/users/use-cases/get-panel-context.use-case.ts), [autorização de unidade](../meatshop-backend/src/units/services/unit-authorization.service.ts) |
| B12 | [Elegibilidade](../meatshop-backend/src/reviews/services/review-eligibility.service.ts), [avaliação de produto](../meatshop-backend/src/reviews/use-cases/create-product-review.use-case.ts), [avaliação de unidade](../meatshop-backend/src/reviews/use-cases/create-unit-review.use-case.ts) |
| B13 | [Suporte](../meatshop-backend/src/support), [controle de acesso testado](../meatshop-backend/src/support/services/support-ticket-access.service.spec.ts), [documentação](platform-support.md) |
| B14 | [Cliente IA](../meatshop-backend/src/ai/ai-chatbot.client.ts), [conversa](../meatshop-backend/src/ai/ai-conversation.service.ts), [testes](../meatshop-backend/src/ai/ai-chatbot.client.spec.ts) |
| B15 | [Interceptor](../meatshop-backend/src/audit/audit-log.interceptor.ts), [persistência](../meatshop-backend/src/audit/audit-trail.service.ts), [sanitização](../meatshop-backend/src/audit/utils/sanitize-payload.ts), [módulo global](../meatshop-backend/src/audit/audit.module.ts) |
| B16 | [Política de pagamento](../meatshop-backend/src/payments/payment-policy.ts), [confirmar pedido](../meatshop-backend/src/orders/use-cases/confirm-order.use-case.ts) |
| B17 | [Transições](../meatshop-backend/src/orders/validators/order-status-transition.validator.ts), [status transacional](../meatshop-backend/src/orders/services/order-status.service.ts) |
| B18 | [Resumo financeiro](../meatshop-backend/src/finance/use-cases/get-finance-summary.use-case.ts), [receita mensal](../meatshop-backend/src/finance/use-cases/get-monthly-revenue.use-case.ts), [gráficos](../meatshop-backend/src/dashboard/use-cases/get-orders-chart.use-case.ts) |
| B19 | [Ciclo de pagamentos](../meatshop-backend/src/payments/payment-lifecycle.service.ts) |
| B20 | [Documentos/aceites](../meatshop-backend/src/legal), [exclusão de conta](../meatshop-backend/src/users/use-cases/delete-account.use-case.ts), [retenção de localização](../meatshop-backend/src/delivery/services/delivery-tracking-retention.service.ts), [retenção IA](../meatshop-backend/src/ai/ai-retention.service.ts) |
| M01 | [Cadastro](../../meatshop-mobile/lib/ui/screens/auth/register_screen.dart), [troca de senha](../../meatshop-mobile/lib/ui/screens/auth/change_password_screen.dart), [Firebase Auth](../../meatshop-mobile/lib/services/firebase_identity_service.dart), [bloqueio local](../../meatshop-mobile/lib/services/login_attempts_service.dart) |
| M02 | [Catálogo e horários via API](../../meatshop-mobile/lib/infra/repositories/http_marketplace_repository.dart) |
| M03 | [CartProvider](../../meatshop-mobile/lib/providers/cart_provider.dart), [testes](../../meatshop-mobile/test/providers/cart_provider_test.dart) |
| M04 | [Pedidos via API](../../meatshop-mobile/lib/infra/repositories/http_order_repository.dart), [recuperação testada](../../meatshop-mobile/test/infra/repositories/pending_checkout_recovery_test.dart), [checkout UI](../../meatshop-mobile/lib/ui/screens/cart) |
| M05 | [Busca](../../meatshop-mobile/lib/providers/search_provider.dart), [filtros](../../meatshop-mobile/lib/ui/components/sheets/search_filter_sheet.dart), [testes HTTP](../../meatshop-mobile/test/infra/repositories/http_marketplace_repository_test.dart) |
| M06 | [GPS](../../meatshop-mobile/lib/services/discovery_location_source.dart), [UnitProvider](../../meatshop-mobile/lib/providers/unit/unit_provider.dart), [seletor](../../meatshop-mobile/lib/ui/components/maps/unit_location_selector.dart), [testes](../../meatshop-mobile/test/providers/unit_location_test.dart) |
| M07 | [Notificações](../../meatshop-mobile/lib/services/notification_service.dart), [preferências](../../meatshop-mobile/lib/providers/user_preferences_provider.dart), [testes](../../meatshop-mobile/test/providers/user_preferences_provider_test.dart) |
| M08 | [Avaliações](../../meatshop-mobile/lib/providers/review_provider.dart), [testes](../../meatshop-mobile/test/providers/review_submission_test.dart) |
| M09 | [Chat](../../meatshop-mobile/lib/providers/chat_provider.dart), [repositories](../../meatshop-mobile/lib/data/repositories), [recuperação testada](../../meatshop-mobile/test/providers/chat_list_recovery_test.dart) |
| M10 | [Repository IA testado](../../meatshop-mobile/test/infra/repositories/http_ai_assistant_repository_test.dart) |
| M11 | [Aceite](../../meatshop-mobile/lib/ui/widgets/legal_section.dart), [identidade/perfil/exclusão](../../meatshop-mobile/lib/providers/auth/auth_provider.dart), [teste de aceite](../../meatshop-mobile/test/ui/legal_acceptance_test.dart) |
| W01 | [Autenticação web](../meatshop-main/src/modules/auth) |
| W02 | [Configuração da unidade](../meatshop-main/src/modules/settings/components/profile-screen.tsx), [teste](../meatshop-main/src/modules/settings/components/profile-screen.spec.tsx) |
| W03 | [Produtos](../meatshop-main/src/modules/products), [pedidos](../meatshop-main/src/modules/orders), [financeiro](../meatshop-main/src/modules/finance), [dashboard](../meatshop-main/src/modules/dashboard) |
| W04 | [Suporte web](../meatshop-main/src/modules/support), [chat](../meatshop-main/src/modules/chat) |
| W05 | [Auditoria web](../meatshop-main/src/modules/audit/audit-screen.tsx) |
| W06 | [Configuração de conta](../meatshop-main/src/modules/settings/components/account-screen.tsx) |
| I01 | [Chatbot](../../meatshop-chatbot/app/chatbot.py), [segurança](../../meatshop-chatbot/app/safety.py), [filtro](../../meatshop-chatbot/app/filter.py), [testes](../../meatshop-chatbot/tests) |
| O01 | [Compose](../docker-compose.yml), [CI web/backend](../.github/workflows/ci.yml), [CI mobile](../../meatshop-mobile/.github/workflows/mobile-ci.yml) |
| O02 | [Smoke de desempenho](../scripts/performance-smoke.mjs) |
| O03 | [Prometheus](../prometheus.yml), [regras de alerta](../prometheus-alerts.yml), [métricas](../meatshop-backend/src/metrics) |
| O04 | [Preparação de produção](../PRODUCTION_DEPLOYMENT.md) |
| T01 | [E2E gaps PostgreSQL](../meatshop-backend/test/functional-gaps.e2e-spec.ts) |
| T02 | [E2E pagamentos](../meatshop-backend/test/payments.e2e-spec.ts) |

