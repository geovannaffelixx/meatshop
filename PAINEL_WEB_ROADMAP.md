# Roadmap de finalização — Painel Web (MeatShop)

Ordem sugerida pra fechar o painel web, do que falta hoje. Cada bloco parte do anterior — não pula fase sem motivo. Pra cada item: o que já existe pronto no backend, o que falta (backend e/ou frontend), e por que está nessa posição.

Como usar: quando for atacar um item, me chama e a gente detalha tela por tela (campos, fluxo, layout) antes de eu escrever código. Isso aqui é só a ordem e o escopo de cada parte, não o detalhamento.

Referência: RF-010 da especificação do projeto marca "painel para administrador gerenciar produtos, pedidos e promoções, além de visualizar relatórios" como **prioridade Alta** — os blocos 1 e 3 fecham exatamente isso.

---

## Bloco 1 — Fechar o operacional (maior impacto, é o core do painel)

Sem isso, o açougueiro consegue **ver** pedido e despesa, mas não consegue **operar** — o painel fica de vitrine.

### 1.1 Ações de pedido
- **Status:** não iniciado
- **Backend:** pronto (`PATCH /orders/:id/confirm`, `/status`, `/cancel`, `/schedule`, `POST /orders/:id/repeat`)
- **Frontend:** `/orders` e `/orders/[id]` são só leitura hoje — precisa de botões de ação no detalhe (confirmar → preparando → pronto → saiu pra entrega → entregue; cancelar com motivo; reagendar)
- **Por que primeiro:** é o maior gap prático — o painel existe pra isso e hoje não faz.

### 1.2 Editar/excluir despesa (Financeiro)
- **Status:** não iniciado
- **Backend:** pronto (`PUT /finance/expenses/:id`, `DELETE /finance/expenses/:id`)
- **Frontend:** modal de despesa só cria hoje — falta ação de editar/excluir na listagem
- **Por que aqui:** pequeno, mesma tela que já existe, fecha um CRUD que já está pela metade.

---

## Bloco 2 — Configurações (3 placeholders, visíveis na sidebar o tempo todo)

Toda tela hoje é "em construção" — chama atenção por estar sempre visível no menu.

### 2.1 Segurança (troca de senha)
- **Status:** não iniciado
- **Backend:** pronto (`POST /auth/change-password`)
- **Frontend:** placeholder puro
- **Por que primeiro do bloco:** zero trabalho de backend, mais simples dos três.

### 2.2 Perfil
- **Status:** não iniciado
- **Backend:** **incompleto** — só existe `GET /users/me`. Não existe `PATCH /users/me` (atualizar nome/e-mail) nem uma coluna real de foto de perfil (o upload de logo de usuário existente grava num campo que não existe na entity — bug antigo, não é pra reaproveitar).
- **Frontend:** placeholder; a sidebar já busca e mostra nome/e-mail/foto, só a tela de editar que falta.
- **Por que aqui:** precisa de endpoint novo antes do frontend — combinar o que é editável (nome? e-mail? foto?) antes de mexer no backend.

### 2.3 Usuários (membros da unidade)
- **Status:** não iniciado
- **Backend:** **incompleto** — existe `POST /units/:unitId/members` (adicionar), mas não existe endpoint de **listar** membros de uma unidade nem de remover/alterar role. Precisa decidir e completar o CRUD no backend antes da tela.
- **Frontend:** placeholder
- **Por que por último do bloco:** é o que tem mais buraco de backend dos três.

---

## Bloco 3 — Catálogo e vendas (backend já pronto, só falta tela)

Fecha o resto do RF-010 ("gerenciar promoções").

### 3.1 Promoções
- **Status:** não iniciado
- **Backend:** pronto (`POST /promotions`, `PATCH /promotions/:id`, `/activate`, `/deactivate`)
- **Frontend:** nenhuma tela — hoje só existe o campo solto `promotionActive` (legado, não é o modelo novo de `Promotion`)

### 3.2 Horário de funcionamento
- **Status:** não iniciado
- **Backend:** pronto (`GET`/`PUT /units/:unitId/business-hours`)
- **Frontend:** nenhuma tela — provavelmente cabe dentro de "Configurações" ou como aba da própria unidade

### 3.3 Cupons
- **Status:** concluído, ainda não lançado
- **Backend:** cupons `PLATFORM` e `UNIT`, regras de elegibilidade, limites, resgate transacional e histórico por pedido
- **Frontend:** gestão global para `SUPER_ADMIN` e gestão local para `OWNER`/`MANAGER`, com formulário completo e histórico de usos

---

## Bloco 4 — Conteúdo e engajamento

### 4.1 Receitas
- **Status:** não iniciado
- **Backend:** pronto (`POST/PATCH/DELETE /recipes`)
- **Frontend:** nenhuma tela — unidade cadastra receita da semana com passos, ingredientes e produtos em destaque

### 4.2 Avaliações
- **Status:** não iniciado
- **Backend:** pronto, só leitura (`GET /reviews`)
- **Frontend:** nenhuma tela — ver notas/comentários recebidos pela unidade e pelos produtos

---

## Bloco 5 — Suporte e observabilidade

### 5.1 Chamados de suporte
- **Status:** concluído, ainda não lançado
- **Backend:** chamados com conversa persistente, imagens, contexto opcional, fila filtrada, auditoria e notificações; atendimento restrito a `SUPER_ADMIN`
- **Frontend:** área “Ajuda e suporte” para solicitantes e console global de atendimento para `SUPER_ADMIN`

### 5.2 Notificações
- **Status:** concluído na versão 2.3.0
- **Backend:** contexto de unidade, leitura individual/em lote e entrega por Socket.IO
- **Frontend:** sino, pop-ups em tempo real e central de notificações

### 5.3 Log de auditoria
- **Status:** concluído, ainda não lançado
- **Backend:** trilha append-only de sucessos/falhas, sanitização LGPD, filtros, resumo, detalhe, CSV e cobertura HTTP/WebSocket; consulta restrita a `SUPER_ADMIN`
- **Frontend:** painel global com indicadores, filtros, paginação, detalhe antes/depois e exportação

---

## Bloco 6 — Logística e comunicação

### 6.1 Entregadores
- **Status:** etapa operacional e segurança concluídas, ainda não lançado
- **Decisão de escopo:** o app mobile do entregador envia a localização; o painel da unidade acompanha e gerencia a operação.
- **Backend:** consulta agregada, autorização por unidade, localização/status via Socket.IO, atribuição atômica e códigos de retirada/entrega com hash, expiração, limite de tentativas e bloqueio temporário.
- **Frontend:** `/deliveries` com indicadores, lista operacional, mapa ao vivo, gestão/aprovação de entregadores, atribuição manual e validação do código antes de liberar a retirada; cadastro de entregador disponível em “Equipe e acessos”.
- **Segurança:** o cliente recebe o código de entrega ao criar o pedido; o entregador recebe um código exclusivo ao ser atribuído; a unidade apenas valida o código informado e nunca vê o valor esperado.
- **Próximos passos:** geocodificação do destino e cálculo de rota/ETA com provedor de mapas; construir/ligar as telas equivalentes no app mobile do cliente e do entregador aos endpoints já disponíveis.

### 6.2 Chat do pedido
- **Backend:** pronto, mas mensagens novas chegam por WebSocket (não é só REST) — implementação mais complexa que o resto da lista
- **Dúvida:** unidade responde cliente/entregador pelo painel web, ou isso também é só mobile?

---

## Fora do painel (não é gap, é escopo diferente)

Carrinho, cartões salvos, checkout Mercado Pago — são fluxo de compra do **cliente final**, que usa o app mobile, não o painel da unidade. Não entram nesta lista.
