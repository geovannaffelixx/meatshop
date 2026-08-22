# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Corrigido

- Mapeamento da relação entre `refresh_tokens.user_id` e usuário, eliminando o erro de coluna `userId` durante cadastro e login.
- Respostas de conflito para e-mail, CPF e CNPJ duplicados agora usam HTTP 409, código estável e mensagem segura em português.
- Erros internos deixam de expor detalhes do banco de dados ao cliente.

## [1.1.0] - 2026-08-21

### Adicionado

- Controle de acesso por unidade com `OWNER`, `MANAGER`, `OPERATOR` e `DELIVERY`.
- Política central de permissões e contexto do painel em `GET /users/me`.
- Endpoints de gestão de membros e migration reversível dos papéis antigos.
- Testes automatizados da matriz de permissões.

### Alterado

- Categorias, produtos, promoções, receitas e finanças validam permissões específicas.
- Novas unidades vinculam o criador como proprietário (`OWNER`).

### Segurança

- Entregadores não recebem acesso ao painel administrativo.
- Somente proprietário ou superadministrador pode conceder papel de gerente.
- Toda ação protegida é autorizada pela API.

## [1.0.0] - 2026-03-03

### Adicionado

- Integração do Mercado Pago Checkout Pro.
- Endpoint para geração do link de checkout e webhook público de pagamentos.
- Serviço de processamento de pagamentos usando o SDK oficial.
- Campos de rastreamento do Mercado Pago em pedidos.
