# Notificações do painel web

## Objetivo

Entregar alertas persistentes e em tempo real aos usuários autorizados de cada unidade, sem misturar acontecimentos entre açougues.

## Fluxo

1. Um caso de uso chama `SendNotificationUseCase` com usuário, tipo, unidade, título, mensagem e rota opcional.
2. O backend persiste a notificação antes de qualquer entrega.
3. O canal Socket.IO `/notifications` publica `notification:new` somente na sala privada do usuário autenticado.
4. O frontend adiciona o item à central, atualiza o contador e abre um toast acionável.
5. A leitura individual ou em lote é persistida pela API REST.

O push FCM continua independente e só é enviado para dispositivos previamente registrados, conforme RF-008 e RNE-012 da especificação.

## Eventos atuais

- Novo pedido: notifica proprietário, gerente e operador ativos da unidade e abre `/orders/:id`.
- Mudança de status: notifica o cliente vinculado ao pedido.
- Promoção, entrega e sistema: permanecem disponíveis como tipos extensíveis para novos produtores de eventos.

## Alteração no DER

Substitua a entidade `Notification` atual por:

```mermaid
Notification {
  int id PK
  int user_id FK
  int unit_id FK "nullable"
  string title
  string message
  string action_url "nullable"
  string type "ORDER | DELIVERY | PROMOTION | SYSTEM"
  boolean read
  datetime created_at
}
```

Adicione a relação abaixo ao bloco de relacionamentos:

```mermaid
Unit ||--o{ Notification : "contextualiza"
```

A relação existente `User ||--o{ Notification : "receives"` deve ser mantida.
