# Configurar e homologar pagamentos

## Criar a aplicação Mercado Pago

1. Entre com sua conta em [Mercado Pago Developers](https://www.mercadopago.com.br/developers).
2. Em **Suas integrações**, crie a aplicação Meatshop e escolha **Checkout Pro** (Preferences API).
3. Nos detalhes da aplicação, configure OAuth/PKCE e copie **Client ID** e **Client Secret** para o ambiente do backend. Um Access Token central não substitui esses campos: cada açougue autoriza a própria conta pelo Financeiro.
4. Em **Testes → Contas de teste**, prepare dois vendedores e um comprador, todos do Brasil. Comprador e vendedores devem ser diferentes. Guarde suas credenciais no gerenciador de segredos.
5. Em **Webhooks**, habilite o tópico **payment**, cadastre `https://api.seu-dominio.com/webhooks/mercadopago` e guarde o segredo de assinatura fornecido. As preferências acrescentam a unidade à URL; notificações globais identificam o recebedor e também são conferidas na API.

Referências oficiais: [OAuth e PKCE](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation), [notificações](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications) e [compras de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/introduction).

## Endereços HTTPS

Os endereços pertencem à hospedagem do Meatshop: por exemplo, `https://api.seu-dominio.com` para o backend e `https://painel.seu-dominio.com` para o painel. Ambos devem ser acessíveis pelo Mercado Pago e pelo celular. Localhost e o endereço do emulador não recebem callbacks externos.

Prepare um ambiente de homologação isolado, com dados e segredos próprios. Antes de publicar, configure as exigências de [PRODUCTION_DEPLOYMENT.md](../PRODUCTION_DEPLOYMENT.md). O Compose padrão contém credenciais de demonstração e não deve ser exposto como servidor de produção.

Cadastre no Mercado Pago exatamente a URL OAuth:

```
https://api.seu-dominio.com/payments/sellers/oauth/callback
```

## Preencher a configuração

Copie `.env.payments.example` para `.env.payments.local`. O arquivo local é ignorado pelo Git. Preencha os campos vazios e substitua os domínios de exemplo. Não envie segredos no chat.

Gere uma chave própria para `MP_CREDENTIAL_ENCRYPTION_KEY`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Essa chave criptografa os tokens dos vendedores e precisa acompanhar os backups. Não a substitua quando houver contas conectadas sem migrar os tokens. Para `MP_WEBHOOK_SECRET`, use o segredo fornecido pelo Mercado Pago.

Confira a configuração sem mostrar seus valores e inicie um ambiente de teste já preparado:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-payments-readiness.ps1 -ConfigurationOnly
docker compose --env-file .env.payments.local up -d --build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-payments-readiness.ps1
```

Na hospedagem, injete as mesmas variáveis no backend. Mantenha `NODE_ENV=production` no Render, inclusive durante a homologação: o modo seguro do servidor é independente de `MP_ENV=sandbox`, que seleciona os pagamentos de teste. Recompile o painel ao alterar `NEXT_PUBLIC_API_URL`. Compile o mobile para a URL HTTPS:

```powershell
flutter build apk --release --dart-define=MEATSHOP_API_URL=https://api.seu-dominio.com --dart-define=MEATSHOP_ENV=staging
```

O release Android exige a assinatura do projeto. O iOS deve ser compilado e testado no macOS.

No painel, abra **Financeiro**, escolha a unidade, clique em **Conectar Mercado Pago** e autorize com o vendedor correspondente. Confira o recebedor exibido e repita para a segunda unidade. No checkout, use o comprador de teste.

## Regras implementadas

- Cotação assinada por cinco minutos, vinculada ao cliente, itens/quantidades/preços, endereço, agendamento, descontos e meios por unidade. Alterações exigem revisão.
- Tentativa de criação persistida no armazenamento seguro do celular, separada por usuário. Resposta perdida é recuperada antes de iniciar outra compra; tentativa incerta conserva corpo e identidade originais.
- Um pagamento por pedido/unidade; referência canônica numérica e reconciliação de preferências antigas por UUID.
- Prazo local online de 30 minutos. Aprovação após cancelamento/expiração devolve o saldo sem reabrir o pedido.
- Cliente cancela antes do preparo; depois solicita atendimento ao açougue. A unidade usa o fluxo autorizado de cancelamento.
- Devolução parcial iniciada pelo vendedor mantém um pedido confirmado ativo. Devolução total/contestação bloqueiam preparo. O painel solicita devolução do saldo integral; parcial é realizada no Mercado Pago e reconciliada.
- Dinheiro/maquininha: recebimento e devolução integral com comprovante e permissão financeira. Use **A receber presencialmente** para pedidos entregues ainda não baixados.
- Pausar novas cobranças não interrompe acompanhamento/estornos antigos. Mantenha as credenciais configuradas. Preferências já abertas podem continuar notificando até expirar.
- Estorno rejeitado tem retomada explícita. A tentativa anterior é consultada; identidade nova só é criada após rejeição confirmada. Falha incerta preserva a chave anterior.
- Histórico de transações extras, devoluções, tentativas, recebimentos e repasse. Totais/gráficos seguem os mesmos dados e o fuso de São Paulo.
- Valores são indicadores operacionais de recebimentos, taxas/devoluções conhecidas; não representam extrato bancário ou saldo para saque. Devoluções posteriores revisam o período do recebimento original.
- Quantidade/preço revisados no checkout são o contrato da compra. Não há cobrança posterior automática por alteração de peso, comissão Meatshop ou transferência automática ao entregador. O repasse é externo e registrado pelo financeiro.

## Migração

Faça backup. Com as escritas antigas paradas e `DB_SYNCHRONIZE=false`, aplique `PaymentOperations1791900000000`, `PaymentStateIntegrity1791900001000` e `PaymentContract1791900002000`. Publique backend, painel e mobile compatíveis.

A terceira migration rejeita transações compartilhadas entre pedidos, cria os índices e preserva os dados dos produtos nos novos pedidos. Para pedidos antigos, o preenchimento inicial usa os dados disponíveis hoje; não reconstrói nomes históricos que já foram alterados.

Antes de converter `payment_date` antigo, confirme como o servidor anterior gravava as datas. Em produção com histórico, a migração exige `PAYMENTS_LEGACY_TIMEZONE` explícito: `America/Sao_Paulo` para valores locais ou `UTC` para UTC. Compare um recebimento histórico com o provedor antes de escolher. A segunda migration rejeita divergências entre estado do pedido e pagamento; reconcilie-as antes de migrar.

Não limpe históricos financeiros por rotina genérica: participam da deduplicação/recuperação. Defina retenção e arquivamento conforme as obrigações aplicáveis, preservando identificadores necessários. Pagamentos antigos da conta central exigem conciliação própria; não migram automaticamente para vendedores.

Rollback após operações novas requer escritas paradas e backup verificado. Ao reverter datas, use o mesmo fuso confirmado na implantação.

## Matriz de aceite externo

Registre data, dispositivo, unidade, IDs de pedido/pagamento, resultado esperado/observado e evidências sem segredos:

| Caso | Resultado exigido |
|---|---|
| OAuth, recusa, repetição e renovação | Conta correta, callback de uso único e renovação persistida |
| Pix/crédito/débito disponíveis | Total oficial e aprovação somente pelo servidor |
| Cartão recusado/em análise | Sem sucesso falso; retomada/reconciliação |
| Dois vendedores, um pedido pago | Recebedores corretos; outro pedido continua pendente |
| App encerrado, sessão expirada, retorno Android/iOS | Recuperação e pedido correto após autenticação |
| Preço, cupom, itens ou endereço alterados | Nova revisão; nenhuma reserva incorreta |
| Expiração/cancelamento e outra aprovação tardia | Estoque/cupom liberados uma vez; saldo devolvido |
| Webhook ausente/duplicado/fora de ordem/inválido | Recuperação e nenhuma duplicação financeira |
| Estorno aprovado/incerto/rejeitado/resolvido externamente | Histórico e recuperação sem devolução duplicada |
| Devolução parcial e contestação | Estado, valores e continuidade conforme as regras |
| Dinheiro/maquininha/troco/repetição | Valor correto e um registro financeiro |
| Repasse ao entregador | Histórico, recebido no app e totais/gráficos coerentes |
| Outra unidade/sem permissão | Operação e acesso ao histórico recusados |
| Pausa de novas cobranças | Cobranças bloqueadas; estornos antigos continuam |

Testes automatizados simulam respostas do Mercado Pago; não preenchem esta matriz. Libere pagamentos reais depois de registrar os resultados do ambiente publicado.

Os alertas Prometheus cobrem estornos rejeitados, fila antiga e manutenção parada. Configure seu destino na hospedagem. Após 180 dias, cobranças antigas deixam de ser consultadas diariamente; webhooks e reconciliação manual continuam disponíveis.
