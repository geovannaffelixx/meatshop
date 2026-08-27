# Changelog

Todas as mudanças notáveis são documentadas neste arquivo conforme Keep a Changelog e Semantic Versioning.

## [Não lançado]

### Adicionado

- Gestão completa de cupons no painel: campanhas globais para `SUPER_ADMIN` e cupons locais para gestores da unidade.
- Formulário de escopo, desconto, período, pedido mínimo e limites, além de listagem, ativação e histórico de utilizações.
- Traduções dos códigos de erro de elegibilidade e limites dos cupons.
- Painel global de auditoria exclusivo para `SUPER_ADMIN`, com indicadores, busca, período, resultado, paginação e inspeção antes/depois.
- Exportação CSV filtrada e item “Auditoria” na navegação administrativa.
- Área “Ajuda e suporte” para usuários abrirem chamados destinados à plataforma MeatShop.
- Console global de suporte para `SUPER_ADMIN`, com solicitante, unidade, prioridade, status e filtros.
- Conversa completa por chamado, envio e visualização de imagens, encerramento e reabertura.
- Feedback visual de carregamento, sucesso e falha em todas as ações do módulo.

## [2.3.0] - 2026-08-26

### Adicionado

- Central de notificações da unidade com sino no cabeçalho, contador de não lidas e página de histórico.
- Pop-ups em tempo real com título, mensagem e ação para abrir o pedido ou recurso relacionado.
- Ações para marcar uma notificação ou todas as notificações da unidade como lidas.

### Alterado

- O utilitário global de toast agora aceita uma ação navegável opcional e pode ser reutilizado por novos eventos.

## [2.2.0] - 2026-08-25

### Adicionado

- Tela "Minha conta", para editar nome, e-mail e foto de perfil — acessível pelo cartão do usuário no menu e por um novo item em Configurações.
- Tela "Promoções", para criar, editar, ativar e desativar promoções de produtos, com desconto percentual ou preço promocional.
- Tela "Avaliações" (somente leitura), com nota média, filtro por açougue ou produto e exibição de comentários.
- Tela "Receitas", com listagem em cards e formulário completo de criação/edição (ingredientes, modo de preparo, produtos em destaque, foto de capa e vídeo).
- Upload de múltiplas fotos por produto, na criação e na edição.
- Edição e exclusão de despesas no Financeiro — antes só era possível cadastrar.
- Olho de mostrar/ocultar senha em todos os campos de senha do sistema (login, cadastro, redefinição, segurança da conta, criação de usuário da equipe).
- Indicador de carregamento em todos os botões de confirmação do sistema, evitando envio duplicado.
- Barra de progresso no topo da tela durante a navegação entre páginas.
- Sessão renovada automaticamente em segundo plano quando o token de acesso expira, mantendo o usuário autenticado por até 7 dias sem precisar entrar novamente.
- Login e cadastro redirecionam automaticamente para o painel quando o usuário já está autenticado.

### Alterado

- A barra lateral deixou de ser recriada a cada troca de página, tornando a navegação entre telas do painel mais fluida.
- A tela de detalhe do pedido, que não exibia a barra lateral, agora usa o mesmo layout do restante do painel.

### Corrigido

- Botões de "Entrar", "Esqueci minha senha" e "Salvar" na edição de produto não tinham proteção contra clique duplicado.

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
