# Changelog

Todas as mudanças notáveis são documentadas neste arquivo conforme Keep a Changelog e Semantic Versioning.

## [Não lançado]

## [2.1.0] - 2026-08-22

### Adicionado

- Tela “Unidade” com dados cadastrais, endereço, logo e horários de funcionamento.
- Tela “Equipe e acessos” para criar usuários, atribuir cargos, ativar, desativar e remover vínculos.
- Tela “Segurança da conta” para alteração de senha.
- Confirmação acessível antes de remover o acesso de um funcionário.

### Alterado

- “Perfil” foi renomeado para “Unidade”, eliminando a ambiguidade entre usuário e açougue.
- “Usuários” foi renomeado para “Equipe e acessos”.
- O cartão pessoal do menu agora direciona para Segurança da conta.
- A rota antiga `/settings/profile` redireciona para `/settings/unit`.

### Corrigido

- Traduções específicas para conflitos de e-mail, CPF e CNPJ e senha atual incorreta.

## [2.0.0] - 2026-08-21

### Alterado

- Refactor estrutural do frontend e adoção do contexto administrativo por unidade.
- Menu, rotas e dados passaram a respeitar a matriz de permissões do backend.

## [1.0.0] - 2026-03-03

### Adicionado

- Primeira versão estável do painel web.
