# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Corrigido

- Tradução específica para conflitos de e-mail, CPF e CNPJ já cadastrados.

## [0.2.0] - 2026-08-21

### Adicionado

- Contexto centralizado de acesso ao painel e unidade ativa persistida.
- Proteção de páginas administrativas e tela explicativa para contas sem acesso.
- Menu dinâmico conforme as permissões da função local.
- Seletor de unidade para usuários com múltiplos vínculos e superadministradores.
- Tela de gestão de usuários da unidade com função, status e remoção de acesso.
- Toast global e tradução de erros retornados pela API.
- Alternância de visibilidade de senha nas telas de login e cadastro.

### Alterado

- Login direciona contas administrativas ao painel e demais contas à tela de acesso indisponível.
- Seleção de unidade é compartilhada por todas as telas do painel.

### Segurança

- A interface oculta funções não permitidas, mantendo a API como autoridade final.
