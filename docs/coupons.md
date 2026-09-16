# Cupons da plataforma e das unidades

## Modelo de negócio

- `PLATFORM`: criado e administrado apenas por `SUPER_ADMIN`. Sem unidades selecionadas vale para toda a plataforma; com seleção, vale somente nelas.
- `UNIT`: pertence a uma unidade e pode ser administrado por usuários ativos com `MANAGE_PRODUCTS` (`OWNER` e `MANAGER`; `SUPER_ADMIN` mantém bypass global).

Todo cupom possui modalidade única (`PERCENTAGE` ou `FIXED`), início, término, pedido mínimo e pode ter teto de desconto, limite total e limite por cliente. Códigos são normalizados em maiúsculas e permanecem únicos globalmente.

## Consumo e concorrência

Na criação do pedido, o cupom é carregado com bloqueio pessimista. Elegibilidade, limites e cálculo são validados dentro da mesma transação que cria pedido, itens, pagamento e `CouponRedemption`. O contador só é incrementado se toda a transação concluir. O cancelamento libera o resgate e decrementa o contador.

O desconto é aplicado somente ao subtotal; a taxa de entrega não recebe desconto. Desconto fixo e desconto percentual com teto nunca ultrapassam o subtotal.

## Endpoints

- `GET /coupons`: listagem paginada e contextual.
- `POST /coupons`: criação conforme escopo e autorização.
- `GET /coupons/validate/:code?unit_id=&subtotal=`: simulação autenticada para o cliente.
- `GET /coupons/:id`: detalhe administrativo.
- `PATCH /coupons/:id`: edição, ativação e desativação.
- `GET /coupons/:id/redemptions`: até 500 utilizações recentes.

## DER

```mermaid
erDiagram
  User ||--o{ Coupon : creates
  Unit ||--o{ Coupon : owns
  Coupon ||--o{ CouponUnit : restricts
  Unit ||--o{ CouponUnit : accepts
  Coupon ||--o{ CouponRedemption : generates
  User ||--o{ CouponRedemption : redeems
  Unit ||--o{ CouponRedemption : receives
  Order ||--o| CouponRedemption : records

  Coupon {
    int id PK
    string code UK
    string name
    text description
    enum type "PLATFORM | UNIT"
    int unit_id FK "nullable"
    enum discount_type "PERCENTAGE | FIXED"
    decimal discount_amount
    decimal maximum_discount "nullable"
    decimal minimum_order_value
    datetime starts_at
    datetime expires_at
    int total_usage_limit "nullable"
    int usage_limit_per_user "nullable"
    int current_usage_count
    boolean active
    int created_by FK
    datetime created_at
    datetime updated_at
  }
  CouponUnit {
    int coupon_id PK,FK
    int unit_id PK,FK
  }
  CouponRedemption {
    int id PK
    int coupon_id FK
    int user_id FK
    int order_id FK,UK
    int unit_id FK
    decimal discount_amount
    enum status "REDEEMED | RELEASED"
    datetime redeemed_at
    datetime released_at "nullable"
  }
```
