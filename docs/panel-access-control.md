# Controle de acesso do painel

O perfil global (`SUPER_ADMIN` ou `USER`) e o perfil móvel (`CLIENT`, `DELIVERY` ou `BOTH`) são independentes. O painel depende exclusivamente de `UserUnit`, seu status e seu papel local.

| Papel | Dashboard | Pedidos | Produtos | Categorias | Financeiro | Membros | Unidade |
|---|---:|---:|---:|---:|---:|---:|---:|
| OWNER | ✓ | ✓ | ✓ | ✓ | ver/editar | ✓ | ✓ |
| MANAGER | ✓ | ✓ | ✓ | ✓ | ver/editar | ✓ | — |
| OPERATOR | ✓ | ✓ | ✓ | ✓ | — | — | — |
| DELIVERY | — | — | — | — | — | — | — |

`SUPER_ADMIN` ignora a matriz, acessa todas as unidades e escolhe a unidade ativa. Vínculos `INACTIVE` nunca concedem acesso. `GET /users/me` entrega o contexto para a interface, mas cada ação é novamente autorizada no backend.

## DER atualizado

```mermaid
erDiagram
  User ||--o{ UserUnit : "possui vínculos"
  Unit ||--o{ UserUnit : "possui membros"
  User ||--o{ Unit : "é proprietário"
  User { int id PK string global_role "SUPER_ADMIN | USER" string app_profile "CLIENT | DELIVERY | BOTH" }
  Unit { int id PK int admin_id FK string name }
  UserUnit { int id PK int user_id FK int unit_id FK string local_role "OWNER | MANAGER | OPERATOR | DELIVERY" string status "ACTIVE | INACTIVE" }
```
