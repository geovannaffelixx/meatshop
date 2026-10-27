# Releases do painel web

## 3.4.0 — Conformidade com a especificação

Trabalho preparado em 26 de outubro de 2026.

O responsável pela unidade pode ativar ou desativar a loja nas configurações; uma unidade desativada deixa de aparecer para os clientes. A exportação dos dados pessoais em Minha conta passa a gerar o arquivo de verdade, e o chamado de suporte mostra o contato informado pelo cliente.

A sessão do painel ficou mais protegida: as rotas são verificadas também no servidor, as alterações enviam token CSRF e os dados do usuário não ficam mais salvos no navegador. Formulários, filtros e navegação receberam melhorias de acessibilidade, e os fluxos principais têm testes automatizados de ponta a ponta.

A implantação deve ser coordenada com a API e o aplicativo 3.4.0. Esta preparação local não representa publicação ou deploy.

## 3.3.0 — Fechamento de lacunas funcionais

Trabalho preparado em 20 de outubro de 2026.

O responsável pela unidade pode habilitar o agendamento e configurar sua duração e capacidade junto aos horários de funcionamento. Uma unidade sem essa configuração deixa de oferecer horários no aplicativo. O dashboard e o financeiro também passam a diferenciar pedidos operacionais de receita confirmada, com textos explícitos para taxas, estornos e valores líquidos.

A implantação deve ser coordenada com a API e o aplicativo 3.3.0. Esta preparação local não representa publicação ou deploy.

## 3.2.0 — Termos e privacidade

Trabalho preparado em 18 de outubro de 2026.

A tela de Termos e privacidade segue o padrão visual das configurações, com cards de documentos, histórico organizado e destaques nas cores da aplicação.

A versão inclui confirmação explícita dos documentos legais, identificação das versões e histórico de registros. Os responsáveis por unidades confirmam também sua autorização de representação e os termos aplicáveis ao estabelecimento. Contas existentes passam pela regularização, preservando acesso a documentos, suporte e opções da conta.

A implantação deve coordenar a migration, a API, o painel web e o aplicativo 3.2.0. O contato provisório do criador é viniciusrodri0809@gmail.com. Esta preparação local não representa publicação ou deploy.

## 3.1.0 — Experiência e estabilidade

Trabalho realizado em 15 de outubro de 2026.

O painel passa a exigir os fluxos de código para retirada e conclusão das entregas, filtra entregadores aptos para atribuição e identifica os participantes do chat pelos nomes cadastrados. Avaliações exibem apenas o primeiro nome e um ícone de pessoa.

## 3.0.0 — Integração e pagamentos

Trabalho anterior consolidado até 13 de outubro de 2026.

O painel foi atualizado para Next.js 16, recebeu auditoria automatizada de dependências, testes do controle de acesso, headers de segurança e validações obrigatórias no CI. A navegação, o catálogo, as entregas ao vivo, o chat e os módulos administrativos continuam integrados ao backend, agora com imagens otimizadas e build standalone validado.

## 2.3.0 — Central de notificações

Lançada em 26 de agosto de 2026.

O painel agora avisa a equipe em tempo real sobre acontecimentos da unidade. O cabeçalho ganhou um sino com contador, visualização rápida, marcação de leitura e acesso ao histórico completo; eventos relacionados a pedidos também exibem um pop-up que leva diretamente aos detalhes.

## 2.2.0 — Catálogo, conteúdo e experiência de uso

Lançada em 25 de agosto de 2026.

Novas telas de Promoções, Avaliações e Receitas completam o catálogo do açougue, e o Financeiro ganha edição e exclusão de despesas. O perfil pessoal do usuário agora é editável, com foto própria. A navegação entre páginas ficou mais rápida e fluida, a sessão se renova sozinha sem derrubar o usuário, e todo campo de senha e botão de confirmação do sistema passou a seguir o mesmo padrão visual de mostrar senha e indicar carregamento.

## 2.1.0 — Gestão da unidade e equipe

Lançada em 22 de agosto de 2026.

O painel agora reúne configurações do açougue, horários, logo, equipe, cargos e segurança da conta em áreas com nomes claros. Proprietários e gerentes visualizam somente as ações autorizadas para seu papel.

## 2.0.0 — Refactor do painel

Lançada em 21 de agosto de 2026. Versão de referência após o refactor incompatível com a linha 1.x.

## 1.0.0 — Primeira versão estável

Versão anterior ao refactor arquitetural.
