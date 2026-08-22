# Changelog

Todas as mudanças notáveis são documentadas neste arquivo conforme Keep a Changelog e Semantic Versioning.

## [Não lançado]

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
