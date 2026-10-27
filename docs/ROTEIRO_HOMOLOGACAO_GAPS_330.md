# Homologação 3.3.0: primeiro web, depois mobile

Use somente o ambiente local de testes. As contas e os produtos de Anápolis já preparados estão em `TESTES_ANAPOLIS_330.md`, arquivo local. Não publique senhas, tokens ou exportações de dados no Git. Registre cada cenário como aprovado/reprovado, com conta, horário, resultado e captura quando necessário.

## Preparação

1. Abrir `http://localhost:3000/login` e `http://localhost:3001/health`; esperar tela de login e status `ok`.
2. Manter backend atualizado e recompilar o aplicativo mobile depois. Em celular físico, a API deve apontar para o IP acessível do computador, conforme a configuração já usada pelo projeto. `localhost` no celular aponta para o próprio celular.
3. Separar proprietário A, proprietário B, gerente, clientes A/B/C e entregador. Aceitar termos quando solicitado. Para testes de bloqueio/exclusão, usar uma conta descartável, preservando os acessos principais.
4. Anotar preço/estoque/status de um produto de teste e os totais financeiros antes de alterá-los. Restaurar as alterações indicadas no fim de cada caso.
5. Executar promoção antes de entregar novos pedidos: cliente C precisa continuar sem compras entregues e cliente B com promoções desabilitadas para validar a segmentação inicial.

## Web

### W01 — Acesso e isolamento das lojas

1. Entrar como proprietário A e abrir Produtos, Promoções, Pedidos e Configurações.
2. Confirmar a unidade A; entrar como proprietário B em janela anônima e confirmar unidade B.
3. Entrar como gerente e alternar entre as duas unidades.
4. Resultado: cada tela usa a unidade selecionada e os proprietários não conseguem administrar a outra loja. A lista vazia não deve misturar dados de outra unidade.

### W02 — Gestão de produtos inativos

1. Em Produtos da A, localizar o produto inativo de teste. Se houver filtro de ativos, selecionar todos/inativos.
2. Abrir a edição, alterar uma informação reversível, salvar e recarregar.
3. Resultado: produto inativo continua administrável. A alteração persiste. A listagem de promoções continua carregando os produtos permitidos para gestão.
4. Deixar um produto descartável inativo para M03; anotar qual é.

### W03 — Exportação dos próprios dados

1. Configurações → Minha conta → Exportar meus dados.
2. Abrir o JSON baixado. Conferir perfil e seções, por exemplo endereços/pedidos quando existirem.
3. Confirmar ausência de senha, hash de senha, tokens de sessão e informações de contas sem relação com a sua.
4. Repetir com outra conta em janela anônima: a exportação deve refletir essa conta.
5. Com a página carregada, ativar Offline nas ferramentas do navegador e tentar exportar. Esperar aviso de erro, botão habilitado para nova tentativa; voltar Online e repetir.
6. Testar largura de aproximadamente 390 px: botão acessível, campos legíveis e sem rolagem horizontal.

### W04 — Suporte no painel

1. Abrir Suporte e consultar os recursos permitidos à conta. A fila administrativa exige perfil/permissão correspondente.
2. Após M07 criar um chamado no mobile, abrir como atendente autorizado e responder.
3. Confirmar que histórico e estado persistem após recarregar. Uma conta sem permissão não deve obter a conversa de outro cliente.

### W05 — Auditoria

1. Com conta que tenha acesso à auditoria, consultar os registros após a alteração de produto de W02.
2. Conferir entidade/identificador, horário e ator. Podem aparecer intenção, resultado HTTP e alteração transacional para uma mesma ação; são etapas diferentes.
3. Confirmar que credenciais não aparecem nos dados registrados. Se o perfil não expõe essa tela, validar pelo teste de integração, sem promover o usuário apenas para este caso.
4. Não executar DELETE/TRUNCATE no banco da aplicação: a proteção e o rollback são testados no banco isolado (T01).

### W06 — Promoções e agendamento: regressão

1. Ativar a promoção preparada na loja A e depois apenas editar/recarregar a tela.
2. Em M11, conferir público elegível e ausência de notificação duplicada por simples edição.
3. Configurações da unidade → horários/agendamento: conferir intervalo, capacidade e salvar uma alteração reversível.
4. Recarregar: valores persistem. M12 confere esses parâmetros no checkout. Restaurar ao fim.

### W07 — Financeiro e estado de pagamento

1. Anotar os totais atuais da loja. Se a base nunca foi alterada, a referência histórica da A era R$ 215 líquidos; após testes, usar o total atual como base.
2. Em M05, criar pedido com pagamento na entrega. Confirmar no painel que avanço operacional não representa recebimento liquidado automaticamente.
3. Usar a ação autorizada de registro de recebimento quando o fluxo permitir. Conferir receita apenas após liquidação, descontando taxas/estornos aplicáveis.
4. Pedido cancelado e não pago não deve aumentar a receita. Não provocar cobrança/estorno real para testar a interface.

### W08 — Alertas somente no painel

1. Entrar com superadministrador e abrir notificações. As contas de loja não são automaticamente superadministradoras.
2. Abrir `http://localhost:9090/targets`: backend deve estar `UP`. Consultar as regras em `/alerts`.
3. Conferir os testes automatizados do receptor (T01): segredo inválido é recusado; notificações vão somente a administradores ativos e com push desabilitado.
4. Opcional, apenas neste ambiente local: parar backend por tempo suficiente para o alerta de indisponibilidade entrar em firing; mantê-lo parado até o Alertmanager tentar enviar e então iniciar novamente. A entrega ao painel ocorre após recuperação/retry. Isso interrompe as demais sessões: fazer por último. Não há aviso externo enquanto a API está fora do ar.

### W09 — Bloqueio de login

1. Em uma conta descartável válida, errar a senha quatro vezes. Na quinta, esperar bloqueio.
2. Tentar a senha correta em outra janela: continuar bloqueado por 15 minutos. Não confundir com o rate limit por IP se muitas requisições tiverem sido feitas.
3. Antes de expirar, repetir no mobile em M02 com a mesma conta: bloqueio continua centralizado.
4. Depois do prazo, entrar com a senha correta; acesso deve voltar. Não alterar a hora do sistema para simular expiração.

## Mobile

### M01 — Cadastro e troca de senha

1. Recompilar/reiniciar o aplicativo atualizado. Usar a configuração local de API já adotada no projeto.
2. No cadastro de conta nova, testar senha curta, sem maiúscula, sem minúscula, sem número e sem especial. Corrigir um critério por vez.
3. Resultado: validação impede senha inválida; senha entre 8 e 64 caracteres com todos os critérios é aceita. Concluir verificação de e-mail e termos quando solicitados.
4. Trocar senha dessa conta: testar confirmação divergente e senha atual errada; depois concluir corretamente. Sair e testar senha antiga e nova.

### M02 — Login central

1. Entrar normalmente como cliente e depois como entregador; confirmar perfil correto.
2. Repetir W09 com a mesma conta descartável em outro aparelho/instância do app: senha correta não supera bloqueio ainda ativo.
3. Com conexão indisponível, tentar login: erro de rede deve permitir recuperação. Indisponibilidade do Firebase não deve ser classificada pelo backend como senha errada; essa distinção tem teste automatizado com provedor simulado.

### M03 — Catálogo e disponibilidade

1. Como cliente, abrir a loja A. Produto inativo e produto sem estoque não devem aparecer como compráveis.
2. Procurar o produto deixado inativo em W02; tentar acesso por histórico/detalhe se disponível.
3. No painel, reativar o produto; atualizar o aplicativo e confirmar retorno quando categoria e estoque também permitirem.
4. Adicionar produto disponível ao carrinho. Desativar a categoria no painel e tentar atualizar/cotar/comprar; operação deve impedir compra inválida. Restaurar categoria e produto ao fim.

### M04 — Cidade/região e busca paginada

1. Negar/desativar GPS. No seletor de localização, escolher busca por cidade ou região.
2. Buscar `Anápolis` e região `GO`; repetir sem acento. Conferir as lojas de teste. Testar apenas cidade e apenas região; campos ambos vazios devem ser recusados.
3. Buscar uma cidade sem lojas: esperar estado vazio, sem travar. Voltar à cidade correta.
4. Alternar para GPS/endereço: filtro manual anterior não deve continuar restringindo os resultados.
5. Buscar produto; combinar categoria, marca e faixa de preço, inclusive sem texto. Limpar os filtros.
6. Se houver resultados suficientes, avançar páginas/rolar e voltar: sem duplicações ou desaparecimentos indevidos. Com base pequena, a travessia entre tipos de resultado é coberta pelo teste SQL de paginação (T01).

### M05 — Carrinho, estoque e pagamento na entrega

1. Usar cliente A: adicionar produto da A, alterar quantidade e conferir totais. Tentar zero, negativo e quantidade acima do estoque quando a interface permitir entrada.
2. Para produto em UN/PCT, fração deve ser recusada; produto por kg pode aceitar frações válidas.
3. Adicionar produto da B e conferir agrupamento/cotação das duas lojas. Remover o item da B para simplificar o próximo checkout.
4. Escolher retirada ou endereço coberto, revisar cotação e confirmar com pagamento na entrega.
5. Resultado: pedido criado uma vez, estoque reservado/descontado conforme fluxo; status de pagamento permanece pendente até recebimento. Conferir W07 no painel.
6. Cancelar um pedido de teste enquanto permitido: estoque e reservas devem ser liberados, sem receita indevida.

### M06 — Repetir compra e total zero

1. Repetir pedido anterior com produtos disponíveis: itens válidos voltam ao carrinho.
2. Esvaziar carrinho; desativar categoria de um produto daquele pedido no painel e repetir. Produto indisponível não deve entrar como comprável; caso sem itens válidos deve ser tratado pela interface.
3. Restaurar categoria. Não transformar preço de catálogo em zero apenas para forçar o caso financeiro.
4. A exceção de total zero deve ser validada pelo teste de política de pagamento (T01). Se houver fixture/cupom autorizado que zere o total no ambiente, confirmar compra e conferir ausência de cobrança externa e tratamento correspondente no pedido.

### M07 — Central de chamados completa

1. Configurações → Meus chamados → novo chamado. Testar envio vazio; depois preencher categoria, assunto e descrição.
2. Enviar; abrir o chamado, sair e voltar. Dados e primeira mensagem devem persistir.
3. Responder; validar a resposta do atendente em W04. Encerrar e reabrir pela ação disponível.
4. Digitar uma resposta, desligar a conexão e enviar. O texto deve permanecer para tentar novamente; reconectar e reenviar.
5. Entrar com cliente B: chamado de A não aparece como próprio. A tentativa de consultar diretamente ID alheio é testada na integração (T01).

### M08 — Despesas do entregador

1. Entrar como entregador → gestão pessoal → Minhas despesas.
2. Cadastrar Combustível, descrição `Teste homologação`, data do mês atual e R$ 12,50. Sair e voltar: registro e total persistem.
3. Editar para R$ 20,00 e outra categoria; confirmar atualização do total.
4. Cadastrar uma segunda despesa de R$ 5,00: total esperado R$ 25,00, se a base desse mês não tinha outros registros.
5. Testar valor vazio, zero, negativo, letras, mais de duas casas decimais e descrição vazia. Resultado: não salvar valor inválido. Data futura é recusada pelo backend.
6. Trocar mês, voltar e navegar páginas quando existirem; total corresponde ao período inteiro, não só à página.
7. Excluir a despesa de R$ 5,00 com confirmação: total volta a R$ 20,00. Cancelar uma exclusão não deve remover o registro.
8. Isolamento entre dois entregadores é coberto em integração; cliente comum não deve obter permissão de despesas de entregador.

### M09 — Exportação de dados

1. Configurações → Exportar meus dados → escolher um destino no compartilhamento do sistema.
2. Abrir o JSON e conferir a conta atual, dados pertinentes e ausência de segredos de autenticação.
3. Cancelar o compartilhamento e tentar de novo. Testar sem conexão e depois recuperar; não deve travar a tela.
4. Comparar com exportação web apenas se usar a mesma conta. Despesas aparecem na exportação do entregador.

### M10 — Layout, fonte ampliada e teclado

1. Ampliar a fonte nas configurações do aparelho. Abrir formulários de chamado e despesa.
2. Focar os últimos campos com teclado aberto e tentar alcançar a ação de salvar/enviar.
3. Resultado: conteúdo acessível por rolagem, sem corte de rótulos/valores; botões podem aumentar de altura. Repetir em orientação/tamanho de tela disponíveis e restaurar a fonte.

### M11 — Preferências e promoção segmentada

1. Após W06, conferir notificações do cliente A: deve receber promoção elegível.
2. Cliente B, com promoções desabilitadas, e C, sem compras entregues, não devem receber essa promoção.
3. Alterar preferências, sair/entrar e conferir persistência. Preferência de push não deve apagar histórico de notificações já existente.
4. Push depende de FCM e permissão do sistema; registrar separadamente falha de push e ausência indevida na caixa de entrada.

### M12 — Agendamento e concorrência

1. Com carrinho de duas lojas, escolher um horário futuro comum a ambas. Não selecionar horário passado.
2. Conferir intervalo/capacidade configurados em W06. Horário fora do funcionamento ou sem vaga não pode ser confirmado.
3. Usando duas contas em aparelhos/sessões separados, tentar a última vaga da mesma loja/intervalo.
4. Resultado: somente uma confirmação ocupa a vaga; a outra recebe indisponibilidade e consegue escolher outro horário. Cancelar quando permitido e conferir liberação.

### M13 — Entrega, recebimento e regressão final

1. Criar pedido de teste para entrega dentro da cobertura; acompanhar no painel como proprietário.
2. Como entregador, ficar online e seguir aceite/retirada/entrega conforme as ações disponíveis. Conferir notificações, chat e atualização do cliente.
3. Testar código incorreto e depois código correto quando solicitado; não concluir com confirmação inválida.
4. Registrar recebimento na entrega pelo fluxo autorizado e conferir W07. Restaurar disponibilidade do entregador e alterações de teste.

## Cobertura técnica automatizada

### T01 — Testes que não devem ser simulados com SQL no banco principal

Já validados nesta etapa: backend 286 testes unitários, web 28, mobile 183, integrações 64. Incluem falha de auditoria provocando rollback, DELETE/TRUNCATE recusados, contagem concorrente de login, isolamento de despesas/exportação/suporte, retenção preservando bloqueios ativos e pedidos, pagamento, paginação e evento Socket.IO entre duas instâncias.

Na pasta `meatshop-backend`: `npm test`. Para a suíte de especificação, o banco `meatshop_spec_test_330` precisa estar migrado. Neste ambiente já foi preparado. No PowerShell:

```powershell
$env:E2E_TEST_DATABASE='meatshop_spec_test_330'
npm run test:e2e -- specification
```

Na pasta `meatshop-main`: `npm test`. Na pasta `meatshop-mobile`: `flutter analyze` e `flutter test`. Esses comandos não iniciam o aplicativo mobile.

### T02 — Retenção e exclusão

Retenção é tarefa de backend; não há tela para envelhecer dados. T01 comprova expiração de metadados antigos preservando bloqueios ativos e pedidos. Exportação pode ser testada em W03/M09. Para exclusão, usar somente conta descartável criada em M01, confirmar identidade recente e seguir a opção existente no app; acesso deve ser revogado. Histórico financeiro é preservado; suporte histórico não recebeu expurgo geral automático. Não excluir contas compartilhadas de teste.

### T03 — Desempenho e réplicas

A suíte de especificação executa seis jornadas de checkout com duas contas dedicadas e gera `meatshop-backend/test-results/specification-performance.json`, sem tokens. Confere estoque restaurado, budgets e comunicação entre dois servidores. Testar réplica pelo Compose exige trocar a topologia local; seguir `IMPLEMENTACAO_GAPS_330.md` somente após terminar homologação funcional. Isso não comprova SLA nem capacidade de produção.

### T04 — CI e escopo

Após o push, o workflow existente dispara em PR para `develop`/`main` ou push nessas branches; push apenas na branch de feature não garante execução automática. Conferir GitHub Actions no PR e os artefatos quando houver execução. A substituição de Firebase Auth/FCM por outro provedor foi retirada do escopo; não existe cenário de troca de provedor a homologar nesta entrega.
