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
- **Status:** não iniciado
- **Backend:** pronto, mas **restrito a `SUPER_ADMIN`** hoje (`POST/PATCH /coupons` exigem role de super admin, não de dono de unidade)
- **Decisão pendente:** isso faz sentido ficar restrito a super admin (cupom de plataforma, não por açougue) ou deveria abrir pra unidade criar cupom próprio? Preciso saber antes de decidir se entra no painel da unidade ou fica de fora.

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
- **Status:** não iniciado
- **Backend:** pronto (`GET /notifications`, `PATCH .../read-all`)
- **Frontend:** nenhuma tela nem sininho na sidebar — precisa decidir o formato (dropdown no topo? página própria?)

### 5.3 Log de auditoria
- **Status:** não iniciado
- **Backend:** pronto, restrito a `SUPER_ADMIN`
- **Frontend:** nenhuma tela — prioridade baixa pro dono comum de unidade, só faz sentido se houver um perfil de super admin usando o painel

---

## Bloco 6 — Avaliar se cabe no painel web (decisão de escopo antes de implementar)

### 6.1 Entregadores
- **Backend:** pronto (aprovar cadastro, veículos, aceite/status/tracking de entrega)
- **Dúvida:** isso é do painel da unidade (aprovar quem entrega pra ela) ou é 100% do app do entregador (mobile)? Precisa decidir antes de tirar da lista ou implementar.

### 6.2 Chat do pedido
- **Backend:** pronto, mas mensagens novas chegam por WebSocket (não é só REST) — implementação mais complexa que o resto da lista
- **Dúvida:** unidade responde cliente/entregador pelo painel web, ou isso também é só mobile?

---

## Fora do painel (não é gap, é escopo diferente)

Carrinho, cartões salvos, checkout Mercado Pago — são fluxo de compra do **cliente final**, que usa o app mobile, não o painel da unidade. Não entram nesta lista.
