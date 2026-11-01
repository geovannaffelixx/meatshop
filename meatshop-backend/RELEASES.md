# Releases do backend

## 3.5.0 — Exportação de relatórios

Trabalho preparado em 1º de novembro de 2026.

A API gera relatórios em Excel com ExcelJS e PDF com PDFKit para financeiro, pagamentos, pedidos, entregadores, catálogo e estoque, desempenho por produto, cupons, promoções, atendimento e avaliações. Filtros e cálculos são processados no backend por unidade, reutilizando os cálculos financeiros e as visões de pagamentos existentes. O desempenho por produto considera somente pedidos entregues com pagamento recebido.

Usuários comuns precisam de vínculo ativo OWNER ou MANAGER na unidade solicitada e podem exportar Excel ou PDF. SUPER_ADMIN também pode exportar JSON e consultar as unidades para seleção no modal. A autorização é conferida no banco a cada solicitação; tentativas, sucessos e falhas que chegam aos casos de uso de exportação são registrados na auditoria.

Os endpoints `GET /exports/reports` e `GET /exports/units` atendem o novo fluxo. `GET /users/me/export` passa a exigir `unit_id` e `format`, mantendo somente os dados pessoais da conta autenticada, inclusive atividades em outras unidades. A auditoria substitui CSV por Excel/PDF/JSON, exclusivamente para SUPER_ADMIN e com unidade obrigatória. Consultas detalhadas recusam resultados acima de 10 mil linhas por seção; dados pessoais têm limite de 10 mil campos exportados.

Não há novas tabelas ou migrations nesta versão. A execução local com Docker foi validada com frontend, backend e banco saudáveis e migrator sem pendências. Typecheck, lint e build passaram, assim como 97 suítes e 1.373 testes no backend. A atualização deve ser coordenada com o painel web 3.5.0; o mobile permanece inalterado e sua futura integração deverá respeitar o novo contrato de exportação pessoal. Não houve publicação ou deploy em produção.

Detalhes em [Exportações web — 3.5.0](../docs/EXPORTACOES_3_5_0.md).

## 3.4.0 — Conformidade com a especificação

Trabalho preparado em 26 de outubro de 2026.

A API passa a atender as regras de negócio e os requisitos que estavam parciais no documento de especificação. O cliente paga o preço promocional que vê no catálogo e no carrinho, pedidos imediatos são recusados com a unidade fechada e pedidos com pagamento na entrega têm prazo para confirmação. Unidades podem ser desativadas, e o cliente pode optar por retirar o pedido no balcão.

A proteção de dados foi reforçada: CPF e telefone ficam cifrados no banco, sessões são encerradas na troca de senha, o painel web recebe proteção CSRF e as métricas exigem token. Consentimentos podem ser revogados, mantendo o histórico. Webhooks do Mercado Pago entram em fila durável e o rate limit passa a ser compartilhado entre réplicas.

A implantação exige configurar as chaves de dados e o token de métricas antes das migrations desta versão, coordenada com o painel web e o aplicativo 3.4.0 e com o chatbot 3.1.0. Esta preparação local não representa publicação ou deploy.

## 3.3.0 — Fechamento de lacunas funcionais

Trabalho preparado em 20 de outubro de 2026.

A API passa a oferecer busca combinada por categoria, marca e preço, preferências de notificações persistidas e agendamento autoritativo por unidade. Cada unidade define a duração dos intervalos e a capacidade; sem configuração, não oferece agendamento. A reserva da vaga é revalidada e bloqueada dentro da transação do checkout.

Promoções novas e reativadas notificam somente clientes ativos que concluíram uma compra naquela unidade e mantêm promoções habilitadas. Os indicadores financeiros distinguem volume operacional de pedidos e receita efetivamente recebida.

A implantação exige executar as migrations de preferências e capacidade de agendamento antes de disponibilizar backend, painel web e aplicativo 3.3.0. Esta preparação local não representa publicação ou deploy.

## 3.2.0 — Termos e privacidade

Trabalho preparado em 18 de outubro de 2026.

A versão inclui confirmação explícita dos documentos legais, identificação das versões e histórico de registros. Os responsáveis por unidades confirmam também sua autorização de representação e os termos aplicáveis ao estabelecimento. Contas existentes passam pela regularização, preservando acesso a documentos, suporte e opções da conta.

A implantação deve coordenar a migration, a API, o painel web e o aplicativo 3.2.0. O contato provisório do criador é viniciusrodri0809@gmail.com. Esta preparação local não representa publicação ou deploy.

## 3.1.0 — Experiência e estabilidade

Trabalho realizado em 15 de outubro de 2026.

A API reforça os contratos do mobile, protege atribuições simultâneas, exige códigos no fluxo de entregas e registra aparelhos sem conflitos de concorrência. Histórico e ganhos deixam de depender de limites fixos. O chat identifica os participantes e separa o contexto de cliente e entregador; avaliações exibem somente o primeiro nome, sem fotos.

## 3.0.0 — Integração e pagamentos

Trabalho anterior consolidado até 13 de outubro de 2026. A integração inicial do mobile foi concluída em 4 de setembro de 2026. Além de administrar push e proteção do aplicativo, o backend oferece preparação local reproduzível, contratos completos para o mobile e PostgreSQL como fonte única dos dados operacionais. A exclusão de conta revoga sessões, remove a identidade Firebase e anonimiza dados pessoais; o perfil público do entregador só é visível ao cliente de um pedido atribuído.

O runtime foi atualizado para NestJS 11.2.3, Express 5, Mercado Pago 3, Nodemailer 10, Firebase Admin 14 e TypeORM 0.3.31. A API ganhou configuração de produção fail-fast, headers seguros, CORS restritivo, limitação global de requisições, retenção automática de localização, métricas, alertas e CI com testes unitários, E2E PostgreSQL, auditoria de dependências e smoke de performance.

### Integração mobile de perfil e carrinho

O aplicativo passa a contar com contratos completos para perfil, avatar, endereços com localização por CEP e carrinho persistente. Um mesmo carrinho aceita produtos de vários açougues e os organiza por unidade, preparando a criação de pedidos separados no checkout. Preço, disponibilidade e estoque são conferidos no servidor a cada alteração.

## 2.3.0 — Notificações em tempo real para a unidade

Lançada em 26 de agosto de 2026.

O módulo de notificações passa a atender o painel web em tempo real, com autenticação segura por cookie, contexto da unidade e links para o recurso relacionado. Quando um novo pedido chega, todos os membros ativos com acesso ao painel daquela unidade são avisados.

## 2.2.0 — Perfil, catálogo visual e conteúdo

Lançada em 25 de agosto de 2026.

Usuários podem editar seus próprios dados e enviar uma foto de perfil de verdade. Produtos ganham galeria com várias fotos e receitas ganham foto de capa, ambos com upload real de arquivo em vez de link de texto. Avaliações de açougues e produtos passam a trazer o nome de quem avaliou. Corrigido um problema que impedia contas criadas antes de 22 de agosto de acessarem o painel.

## 2.1.0 — Gestão da unidade e equipe

Lançada em 22 de agosto de 2026.

Proprietários podem editar os dados e horários da unidade e criar operadores ou gerentes. Gerentes podem administrar a equipe operacional, mas não criar outros gerentes nem alterar dados exclusivos do proprietário.

## 2.0.0 — Refactor de arquitetura e autorização

Lançada em 21 de agosto de 2026. Esta é a versão de referência após o refactor, com contratos e papéis locais incompatíveis com a linha 1.x.

## 1.0.0 — Primeira versão estável

Versão anterior ao refactor arquitetural.
