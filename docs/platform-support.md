# Suporte da plataforma MeatShop

## Decisão de domínio

Este módulo atende problemas da própria plataforma MeatShop. Ele não substitui o chat entre cliente e açougue relacionado a pedidos.

- Usuários comuns abrem, consultam, respondem, encerram e reabrem somente seus chamados.
- `SUPER_ADMIN` consulta a fila global, responde como equipe MeatShop e pode encerrar chamados.
- Unidade e pedido são contextos opcionais; não alteram a propriedade do chamado.

## Fluxo

1. O usuário abre o chamado com categoria, prioridade, assunto e descrição.
2. A descrição é persistida como primeira mensagem da conversa.
3. A equipe `SUPER_ADMIN` recebe uma notificação e consulta a fila global.
4. Cada resposta ou imagem gera uma nova mensagem imutável e atualiza o estado de espera.
5. O destinatário recebe notificação em tempo real e por push, caso possua dispositivo autorizado.
6. Encerramentos e reaberturas, assim como criação e mensagens, geram registros de auditoria.

## Segurança dos anexos

- Somente JPG, PNG, WEBP e GIF.
- Até quatro imagens por mensagem e 5 MB por arquivo.
- Nome físico aleatório por UUID.
- Validação de MIME e assinatura binária.
- Arquivos rejeitados são removidos.

## Endpoints principais

- `POST /support-tickets`: abre um chamado.
- `GET /support-tickets/search`: consulta paginada e filtrada.
- `GET /support-tickets/:id`: retorna detalhes e conversa.
- `POST /support-tickets/:id/messages`: envia texto e/ou imagens em multipart.
- `PATCH /support-tickets/:id/close`: encerra.
- `PATCH /support-tickets/:id/reopen`: reabre.

## Atualização do DER

Substitua `SupportTicket` e adicione as entidades e relações abaixo:

```mermaid
SupportTicket {
  int id PK
  int user_id FK
  int unit_id FK "nullable"
  int order_id FK "nullable"
  int assigned_to FK "nullable"
  string subject
  string category "ACCOUNT | BILLING | ORDER | TECHNICAL | SUGGESTION | OTHER"
  string priority "LOW | NORMAL | HIGH | URGENT"
  string status "OPEN | WAITING_SUPPORT | WAITING_USER | CLOSED"
  datetime last_message_at
  datetime closed_at "nullable"
  datetime created_at
  datetime updated_at
}

SupportMessage {
  int id PK
  int ticket_id FK
  int sender_id FK
  text message "nullable quando houver imagem"
  datetime created_at
}

SupportAttachment {
  int id PK
  int message_id FK
  string file_url
  string original_name
  string mime_type
  int size_bytes
  datetime created_at
}

User ||--o{ SupportTicket : "opens"
User ||--o{ SupportTicket : "is_assigned"
Unit ||--o{ SupportTicket : "contextualizes"
Order ||--o{ SupportTicket : "may_reference"
SupportTicket ||--o{ SupportMessage : "contains"
User ||--o{ SupportMessage : "writes"
SupportMessage ||--o{ SupportAttachment : "has"
```
