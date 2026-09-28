# Pagamentos — implementação e homologação

Branch dos dois repositórios: `fix/payments`. Atualizado em 28/09/2026.

## Modelo de recebimento

Cada açougue conecta sua própria conta Mercado Pago pelo painel **Financeiro → Conectar Mercado Pago**. Cada pedido tem uma cobrança na conta da respectiva unidade. Um carrinho com dois açougues gera dois pedidos, pagos separadamente no aplicativo. Não há cobrança de comissão do Meatshop implementada.

O frete integra o pagamento recebido pelo açougue. O pagamento ao entregador é feito fora do sistema e registrado pelo responsável financeiro depois da transferência. Esse registro aparece nos ganhos do entregador e nas despesas financeiras da unidade; não deve ser lançado novamente como despesa manual.

Pix e cartões online usam Checkout Pro. Número de cartão, CVV, escolha de cartão salvo e condições de parcelamento ficam no Mercado Pago. A seleção inicial no app não garante a disponibilidade de uma modalidade: a oferta final depende do provedor e da conta. Dinheiro e maquininha na entrega permanecem pendentes até o registro do recebimento pelo financeiro.

## Configuração

Configure as variáveis no ambiente do backend; não coloque segredos no Git:

| Variável | Finalidade |
| --- | --- |
| `PAYMENTS_ENABLED=true` | Habilita os pagamentos online |
| `MP_CLIENT_ID` / `MP_CLIENT_SECRET` | Aplicação Mercado Pago que autoriza os vendedores |
| `MP_OAUTH_REDIRECT_URI` | URL pública HTTPS do backend, terminando em `/payments/sellers/oauth/callback`; deve corresponder ao cadastro no Mercado Pago |
| `MP_CREDENTIAL_ENCRYPTION_KEY` | Segredo aleatório de pelo menos 32 caracteres para criptografar tokens; guardar com segurança e não substituir sem migrar os tokens existentes |
| `MP_WEBHOOK_SECRET` | Segredo de assinatura dos webhooks da aplicação |
| `MP_ENV=sandbox` | Ambiente de homologação; produção exige `production` e credenciais compatíveis |
| `BACKEND_PUBLIC_URL` | URL pública HTTPS acessível ao Mercado Pago |
| `FRONTEND_URL` | URL pública do painel e da página de retorno |

As preferências informam o webhook `/webhooks/mercadopago?unit_id=<unidade>`. A assinatura é validada e o pagamento é consultado usando o token da unidade; identidade do recebedor, ambiente, valor e moeda também são conferidos. Não basta enviar um status aprovado no corpo da notificação.

`MP_ACCESS_TOKEN` central não é usado para novas cobranças por vendedor. Os endpoints antigos de cadastro e escolha de cartão padrão retornam 410; os cartões do Checkout Pro são gerenciados no próprio Mercado Pago. Leitura/exclusão de cadastros legados continuam separadas do novo checkout; a exclusão remota legada depende da credencial original.

No Docker local, pagamentos online ficam desabilitados por padrão. Depois de configurar as variáveis locais, execute `docker compose up --build -d`. Para homologar OAuth e webhooks, URLs apenas em localhost não bastam.

## Comportamentos implementados

- Criação de pedidos com chave de idempotência, revisão do total calculado no servidor e cobrança por unidade.
- Preferência reutilizada ao tentar pagar novamente, acesso restrito ao cliente do pedido e bloqueio para pedidos pagos, cancelados ou expirados.
- Prazo de 30 minutos para novos pedidos online; expiração devolve estoque e libera cupom uma vez. Aprovação recebida depois do cancelamento gera solicitação de estorno.
- Aprovação e confirmação do pedido na mesma transação; falhas no processamento do webhook são propagadas para permitir nova tentativa.
- Cobrança aprovada adicional é registrada separadamente e devolvida, preservando a transação aceita.
- Reconciliação periódica, eventos fora de ordem, devolução parcial/total e contestação considerados no estado do pagamento.
- Cancelamento de pedido pago solicita estorno de forma persistente. Repetições usam a mesma chave de idempotência. Solicitar estorno não significa que o dinheiro já foi devolvido.
- Notificações com nova tentativa, sem bloquear a liberação de reservas quando a entrega da notificação falha.
- Dinheiro/maquininha: recebimento e devolução presencial exigem permissão financeira, valor correto e referência do comprovante.
- Recebimentos dos relatórios consideram pagamento confirmado, taxas e devoluções conhecidas, pela data de pagamento. São indicadores operacionais, não extrato bancário ou saldo disponível para saque; devoluções posteriores atualizam o período do recebimento original.
- O app consulta o estado real, permite retomar pagamentos e não confirma sucesso por animação ou parâmetro da URL. Retorno público em `/payment-return` e abertura por `meatshop://payments`.
- “Pedir novamente” recompõe o carrinho com preços atuais, preserva os demais itens e exige nova revisão. O endpoint de recompra agora retorna `cart_updated` e `skippedItems`, sem criar pedidos.

## Migrações e compatibilidade

Aplicar `1790550000000-HardenPayments` e `1790550001000-PaymentReceipts` antes de iniciar o código novo, com `DB_SYNCHRONIZE=false`. Atualizar mobile e backend em conjunto devido às mudanças de recompra e pagamento por pedido. Fazer backup antes da implantação.

Não trocar a conta Mercado Pago de uma unidade com histórico: a reconexão aceita o mesmo recebedor para preservar acesso às cobranças anteriores. A migração de transações reais de uma eventual conta central antiga exige conciliação específica; elas não são automaticamente transferidas para as contas dos açougues. Os valores adicionados aos enums não são removidos pelo rollback da migração.

## Testes automatizados

Backend: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`.

Web: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`.

Mobile: `flutter analyze --no-pub`, `flutter test --no-pub`.

Os testes de pagamentos com PostgreSQL usam exclusivamente o banco isolado `meatshop_payments_test` em `127.0.0.1:5433`, com o esquema base já migrado. O teste aplica as duas migrações novas se necessário e limpa apenas suas próprias fixtures. Para executar no PowerShell, dentro do backend:

```powershell
$env:PAYMENTS_TEST_DATABASE = 'meatshop_payments_test'
npm.cmd run test:e2e -- payments.e2e-spec.ts
```

As respostas do Mercado Pago são simuladas nesses testes. Eles verificam concorrência, rollback, valores/recebedor incorretos, duplicidade, expiração/estoque/cupom, repetição de estorno, autorização OAuth/PKCE, tokens criptografados, renovação, recebimento/devolução offline e recompra sem cobrança. Isso não substitui a homologação externa abaixo.

## Checklist manual — preparação

- [ ] Confirmar `fix/payments` nos dois repositórios e versões compatíveis de backend/mobile.
- [ ] Confirmar migrações e saúde de banco, backend e frontend.
- [ ] Configurar aplicação/credenciais de homologação, URLs HTTPS e segredo do webhook.
- [ ] Separar dois açougues, duas contas vendedoras de teste e um comprador de teste distinto.
- [ ] Conectar cada vendedor à unidade correta e conferir o identificador no painel.
- [ ] Verificar que um usuário sem `MANAGE_FINANCE` não conecta conta nem registra dinheiro/estorno/repasse.
- [ ] Reabrir/reutilizar um callback OAuth e verificar rejeição; reconectar a mesma conta com sucesso.

## Checklist manual — aplicativo e checkout

- [ ] Integração desabilitada: oferecer dinheiro/maquininha, sem prometer Pix/cartão online.
- [ ] Açougue sem conta conectada: bloquear a cotação online e permitir escolher outra forma.
- [ ] Cotação com endereço/frete/desconto: total exibido igual ao cobrado; falha de cotação impede confirmar.
- [ ] Alterar preço entre revisão e confirmação: rejeitar total antigo e apresentar cotação atualizada.
- [ ] Pix aprovado: pedido permanece pendente até confirmação real e depois é confirmado.
- [ ] Cartão aprovado, recusado e pendente: conferir cada estado real, sem sucesso falso.
- [ ] Fechar checkout, voltar ao app, encerrar/reabrir o app e retomar em Meus pedidos.
- [ ] Tocar repetidamente em pagar: reutilizar preferência; não criar outro pedido.
- [ ] Dois açougues: pagar um e deixar o outro pendente; conferir crédito nas contas corretas.
- [ ] Dinheiro com troco: persistir valor; impedir troco menor que o total e orientar valor exato em carrinho com vários açougues.
- [ ] Maquininha: pedido marcado para pagamento na entrega, sem formulário de cartão online.
- [ ] “Pedir novamente”: abrir carrinho, revisar preços/endereço/pagamento e só então criar novo pedido.
- [ ] Abrir a página de retorno sem login; conferir abertura do app em Android e iOS, tanto aberto quanto encerrado.

## Checklist manual — painel, cancelamento e recuperação

- [ ] Impedir confirmação/preparo de pedido online ainda não pago, inclusive pela API.
- [ ] Permitir preparação de dinheiro/maquininha pendente; não contabilizar como recebido antes da baixa.
- [ ] Registrar recebimento offline com comprovante; repetir a ação sem duplicar valores.
- [ ] Cancelar antes do pagamento: liberar estoque/cupom uma única vez e bloquear nova preferência.
- [ ] Deixar pedido online expirar: cancelar e liberar reserva; não permitir pagamento pelo botão do app.
- [ ] Simular aprovação após cancelamento/expiração: manter pedido cancelado e acompanhar estorno até conclusão.
- [ ] Cancelar pedido já pago: acompanhar solicitado → concluído e conferir devolução no Mercado Pago.
- [ ] Simular indisponibilidade no estorno: manter solicitação e recuperar sem duplicar devolução.
- [ ] Estornar parcialmente no Mercado Pago: refletir valor devolvido e estado parcial; depois devolver o saldo.
- [ ] Simular cobrança duplicada e notificação repetida/fora de ordem: não duplicar confirmação nem receita.
- [ ] Simular webhook sem assinatura/vendedor incorreto/valor incorreto: não aprovar pedido.
- [ ] Interromper webhook temporariamente: recuperar pela reconciliação e pela ação Atualizar no Mercado Pago.
- [ ] Devolver dinheiro/maquininha externamente e registrar devolução presencial, com histórico e permissão.
- [ ] Entrega concluída: registrar transferência ao entregador; conferir status no app e despesa no mês correto, sem lançar outra despesa manual.
- [ ] Conferir isolamento financeiro entre unidades e valores do painel após taxa, devolução e contestação.

## Resultado local em 28/09/2026

- Backend: 99 testes unitários e 14 testes de pagamentos com PostgreSQL aprovados.
- Painel: 6 testes aprovados; lint, verificação de tipos e build aprovados.
- Mobile: 61 testes aprovados, análise estática sem problemas e APK Android debug compilado.
- Backend e painel compilados e iniciados em Docker; migrações aplicadas. Health, capabilities e página pública de retorno responderam HTTP 200.
- Provedor simulado nos testes; nenhuma cobrança, transferência ou devolução real foi realizada.
- APK gerado para emulador Android usando `http://10.0.2.2:3001`. Para aparelho físico, recompilar com a URL acessível pela rede do aparelho.

## Homologação ainda necessária

Credenciais/contas Mercado Pago, pagamentos e estornos externos, notificações reais e teste em aparelhos físicos precisam ser validados antes de produção. Build e testes locais não atestam essas etapas. A compilação iOS deve ser feita no macOS.

Referência do provedor para devolução integral e repetição segura: [API de estornos do Checkout Pro](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/create-refund/post).
