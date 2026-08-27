# Changelog

Todas as mudanças notáveis são documentadas neste arquivo conforme Keep a Changelog e Semantic Versioning.

## [Não lançado]

### Adicionado

- Domínio de cupons `PLATFORM` e `UNIT`, com escopo por unidades, período, pedido mínimo, teto de desconto e limites total/por cliente.
- Histórico de resgates por pedido e consumo transacional com bloqueio contra concorrência; cancelamentos liberam o uso.
- Endpoints paginados de gestão, simulação contextual, detalhe e histórico, autorizados por papel global ou permissão da unidade.
- Testes das regras de cálculo, pedido mínimo, escopo e limite total.
- Trilha global de auditoria com sucesso e falha, contexto de unidade, identificação anônima por hash, correlação HTTP e eventos do chat WebSocket.
- Consultas administrativas de resumo, detalhe, filtros avançados e exportação CSV protegida.
- Migration que preserva eventos após exclusão do usuário/unidade e torna `audit_logs` append-only.
- Testes da sanitização de dados e classificação semântica de rotas críticas.
- Conversas persistentes nos chamados de suporte, com histórico completo de mensagens e remetentes.
- Upload protegido de até quatro imagens por mensagem, limitado a 5 MB por arquivo e validado por MIME e assinatura binária.
- Categorias, prioridades, contexto opcional de unidade/pedido, responsável, datas operacionais e filtros paginados.
- Notificações em tempo real para novos chamados e respostas, além de registros de auditoria do ciclo de atendimento.
- Reabertura de chamados encerrados e estados de espera separados entre usuário e equipe MeatShop.

### Alterado

- Cupons legados são migrados para campanhas globais preservando código, desconto e validade.
- Criação de pedidos passa a validar e consumir cupons atomicamente, com códigos de erro estáveis em português.
- Snapshots removem credenciais, mascaram dados pessoais e truncam conteúdo excessivo.
- Logger HTTP deixa de registrar query strings e associa o usuário autenticado quando disponível.
- Respostas legadas de `SUPER_ADMIN` agora também utilizam o histórico imutável de mensagens.
- Dados antigos de descrição e resposta são migrados para a nova conversa sem perda de conteúdo.

## [2.3.0] - 2026-08-26

### Adicionado

- Canal Socket.IO autenticado por cookie para entregar notificações ao painel em tempo real.
- Contexto de unidade, título e rota de ação nas notificações, com migração reversível e índice de consulta.

### Alterado

- Novos pedidos notificam todos os membros ativos com acesso ao painel da unidade, não apenas o proprietário.
- Listagem e leitura em lote aceitam o filtro da unidade ativa, preservando também alertas globais.

## [2.2.0] - 2026-08-25

### Adicionado

- Endpoint de atualização do próprio perfil (`PATCH /users/me`), com nova coluna `avatar_url`; alterar o e-mail marca a conta como não verificada e reenvia o e-mail de confirmação.
- Upload de galeria de fotos do produto (`POST /products/:id/images`, `DELETE /products/:id/images/:imageId`), com nova tabela `product_images` e sincronização automática da foto de capa em `Product.image_url`.
- Upload de foto de capa da receita (`POST /recipes/:id/image`), que antes só aceitava uma URL de texto.
- Listagem de avaliações (`GET /reviews`) passa a retornar o nome do cliente e do produto avaliado, em vez de apenas os identificadores.

### Alterado

- Configuração de arquivos estáticos passou a servir toda a pasta `uploads` — antes servia apenas o subdiretório de avatares, o que impedia o carregamento de logos de unidade, fotos de produto e capas de receita.
- Templates de e-mail de verificação de conta e redefinição de senha traduzidos para português.

### Corrigido

- Upload de logo do usuário gravava em um campo inexistente na entidade e nunca era persistido; agora grava na coluna real `avatar_url`.
- Aplicada migração pendente que renomeia os papéis locais de `ADMIN`/`MEMBER` para `OWNER`/`MANAGER`/`OPERATOR`. O valor antigo ainda gravado em contas existentes quebrava a checagem de permissões em qualquer chamada autenticada, impedindo o acesso ao painel.
- Editar uma promoção trocando entre desconto percentual e preço promocional deixava o valor anterior órfão no banco em vez de limpá-lo.

## [2.1.0] - 2026-08-22

### Adicionado

- Consulta protegida das configurações completas de uma unidade.
- Criação transacional de usuário e vínculo administrativo pela gestão da equipe.
- Validações de cargo: gerentes criam operadores; proprietários e superadministradores também podem criar gerentes.
- Testes das regras de criação de membros.

### Alterado

- Dados completos de endereço passam a fazer parte do contrato de atualização da unidade.
- Swagger atualizado com os endpoints de configurações e criação de usuário da unidade.

### Corrigido

- Relação entre `refresh_tokens.user_id` e usuário.
- Conflitos de e-mail, CPF e CNPJ retornam HTTP 409 com códigos estáveis e mensagens seguras.

## [2.0.0] - 2026-08-21

### Alterado

- Refactor estrutural do backend para arquitetura modular baseada em controllers, DTOs e casos de uso.
- Papéis locais incompatíveis com a versão 1.x foram substituídos por `OWNER`, `MANAGER`, `OPERATOR` e `DELIVERY`.
- Acesso ao painel passou a depender do vínculo ativo com a unidade e de permissões específicas.

### Segurança

- Autorização centralizada por unidade e bloqueio de entregadores no painel administrativo.

## [1.0.0] - 2026-03-03

### Adicionado

- Primeira versão estável, incluindo pedidos, catálogo, entregas e integração Mercado Pago.
