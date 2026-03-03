## [1.0.0] - 2026-03-03
### Added

- Integração do Mercado Pago Checkout Pro.
- Criação do endpoint responsável pela geração do link de checkout para pedidos.
- Implementação do webhook público para recebimento automático de notificações de pagamento.
- Integração direta com a API oficial do Mercado Pago utilizando SDK oficial.
- Criação do serviço para processamento de pagamentos.
- Adição de novos campos na order.entity.ts para armazenar dados do Mercado Pago:
    - mpPreferenceId
    - mpPaymentId
    - mpStatus
    - mpStatusDetail
    - mpLastEventAt
    - mpPaidAt
    - valorPago