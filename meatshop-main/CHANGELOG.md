# Changelog

Todas as mudanças notáveis são documentadas neste arquivo conforme Keep a Changelog e Semantic Versioning.

## [3.0.0] - Em desenvolvimento

### Adicionado

- Assistente de IA para criação de receitas, com definição de porções, seleção explícita de produtos, prévia do conteúdo e aplicação manual do rascunho.
- Gestão de cupons globais e por unidade, incluindo regras de elegibilidade, limites de uso, vigência, pedido mínimo e histórico de utilizações.
- Auditoria administrativa para `SUPER_ADMIN`, com indicadores, filtros, paginação, comparação antes/depois e exportação CSV.
- Central de ajuda e suporte com abertura de chamados, prioridades, anexos, conversa, encerramento e reabertura.
- Indicador da versão atual no rodapé da tela de login, obtido diretamente do `package.json`.

### Alterado

- Painel atualizado para Next.js 16.3.8, com proxy compatível, build standalone e imagens internas servidas pelo componente otimizado do framework.
- Estados de carregamento e feedback das operações foram padronizados para reduzir ações duplicadas e tornar o comportamento da interface previsível.

### Segurança

- Dependências transitivas `sharp` e `source-map-js` atualizadas para versões corrigidas, mantendo a auditoria de produção sem vulnerabilidades conhecidas.
- Headers contra MIME sniffing, framing, vazamento de referência e uso indevido de recursos sensíveis do navegador.
- Rotas privadas protegidas pelo proxy e por uma matriz declarativa de acesso, com negação segura para caminhos não mapeados.

### Qualidade

- Testes automatizados para as regras de acesso, gates de cobertura e validação integrada do frontend com backend, banco de dados e chatbot no CI.

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
