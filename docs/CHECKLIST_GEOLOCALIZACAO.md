# Checklist de testes de geolocalização — web e mobile

Criado em: 27/09/2026. Branch prevista nos dois repositórios: `fix/geolocation`.

Marque `[x]` somente após executar e confirmar o resultado esperado. Para falhas ou casos não aplicáveis, mantenha `[ ]` e registre `FALHOU`, `BLOQUEADO` ou `N/A` nas observações. Testes automatizados aprovados não substituem os testes em aparelho físico.

## Registro da execução

- Data/hora:
- Responsável:
- Commit web/backend (`git rev-parse --short HEAD`):
- Commit mobile (`git rev-parse --short HEAD`):
- Aparelho/modelo:
- Android/iOS e versão:
- Versão/build do app:
- Navegador e versão:
- URL da API usada pelo app:
- Cliente / unidade / entregador A / entregador B usados:
- IDs dos pedidos de teste:

## 1. Preparação

- [ ] Confirmar a branch e registrar os commits dos dois repositórios.
- [ ] Executar `docker compose up -d --build` na raiz do repositório web/backend.
- [ ] Executar `docker compose ps`: frontend, backend e PostgreSQL devem estar saudáveis; migrator deve encerrar sem erro.
- [ ] Abrir o painel em `http://localhost:3000` e conferir a API em `http://localhost:3001/health`.
- [ ] Instalar/abrir um build do mobile que contenha as correções de geolocalização.
- [ ] No celular físico, configurar a API com `http://<IP-DO-PC>:3001`, usando a configuração existente do projeto. Não usar `localhost` para acessar o computador pelo celular.
- [ ] Confirmar comunicação celular/API na mesma rede e acesso pela porta 3001.
- [ ] Preparar cliente com endereço, unidade ativa com produtos e coordenadas confirmadas e dois entregadores habilitados.
- [ ] Preparar acesso ao painel com permissão para visualizar entregas e uma conta sem essa permissão.
- [ ] Usar pedidos e contas de teste; evitar alterar pedidos reais.
- [ ] Manter outro aparelho ou navegador aberto para observar o mapa enquanto o celular do entregador se movimenta.

Observações:

## 2. Mobile — busca de açougues e consentimento

- [ ] Abrir Home e lista de açougues: o seletor de localização deve estar acessível nas duas telas.
- [ ] Abrir o catálogo sem tocar em usar localização: a busca não deve solicitar GPS automaticamente.
- [ ] Escolher **Usar minha localização**: o propósito da consulta deve estar claro e a permissão deve ser solicitada quando necessária.
- [ ] Permitir localização: o catálogo deve atualizar considerando o ponto obtido.
- [ ] Conferir distâncias exibidas e ordenação por proximidade com pelo menos dois açougues em distâncias diferentes.
- [ ] Confirmar que a consulta pelo GPS não altera o endereço de entrega cadastrado.
- [ ] Negar permissão: deve aparecer orientação e continuar possível escolher localização manualmente.
- [ ] Negar permanentemente/revogar a permissão nas configurações: o app não deve travar ou ficar carregando indefinidamente.
- [ ] Desligar o GPS antes da consulta: deve aparecer orientação e permanecer disponível a alternativa manual.
- [ ] Escolher **Escolher no mapa**, marcar um ponto e confirmar: atualizar catálogo sem exigir permissão de GPS.
- [ ] Cancelar o mapa sem confirmar: preservar a localização de busca anterior.
- [ ] Escolher **Usar endereço padrão** quando disponível: usar o endereço salvo na busca.
- [ ] Escolher **Ver todos os açougues**: remover o filtro de proximidade.
- [ ] Selecionar manualmente um ponto enquanto uma consulta GPS está pendente: a resposta atrasada não deve substituir a escolha manual.
- [ ] Atualizar o endereço padrão após escolher busca manual: não substituir silenciosamente a escolha manual atual.
- [ ] Buscar em local sem unidades atendendo a região: apresentar estado vazio, sem erro ou distância inventada.
- [ ] Testar unidade fora dos 25 km da busca e unidade fora do próprio raio de entrega: não aparecer como disponível naquela busca por proximidade.
- [ ] Desligar a internet durante a busca e tentar novamente após reconectar: recuperar a listagem.
- [ ] Sair da tela durante uma consulta e voltar: sem travamento ou atualização de tela já descartada.

Observações:

## 3. Mobile — endereço e confirmação do ponto

- [ ] Cadastrar endereço com CEP válido: preencher os dados disponíveis e abrir o mapa próximo da região correspondente.
- [ ] Confirmar manualmente a entrada correta no mapa e salvar: reabrir o endereço e conferir o ponto.
- [ ] Alterar rua, número, bairro, cidade, estado ou CEP: invalidar o ponto anterior quando houver mudança real de endereço e exigir nova confirmação quando aplicável.
- [ ] Alterar somente a formatação do CEP ou maiúsculas/minúsculas do estado: preservar o ponto quando o endereço continuar o mesmo.
- [ ] Cancelar a seleção de ponto: não salvar um ponto como se tivesse sido confirmado.
- [ ] Testar CEP sem coordenadas: não posicionar o endereço em latitude/longitude `0,0` por ausência de dados.
- [ ] Simular falha da consulta de CEP: permitir preenchimento manual e confirmação do ponto.
- [ ] Tentar confirmar ponto muito distante do CEP: apresentar validação compreensível, preservando o formulário.
- [ ] Criar pedido com endereço confirmado e depois editar/excluir o endereço salvo: conferir que o destino do pedido continua sendo o original.
- [ ] Conferir disponibilidade de entrega e frete para endereço próximo, distante e fora da área atendida.

Observações:

## 4. Web — cadastro e edição da unidade

- [ ] No cadastro da unidade, consultar CEP válido: preencher campos e permitir marcar a entrada no mapa.
- [ ] Abrir o mapa, mover o ponto e confirmar: mostrar confirmação e salvar as coordenadas escolhidas.
- [ ] Reabrir as configurações da unidade: recuperar endereço e ponto salvos.
- [ ] Cancelar o seletor do mapa: não substituir o ponto salvo.
- [ ] Alterar um componente real do endereço após confirmar o ponto: invalidar a confirmação anterior.
- [ ] Alterar somente formatação do CEP ou caixa do estado: não descartar um ponto válido pelo backend.
- [ ] Testar CEP inválido, inexistente, sem coordenadas e indisponibilidade do serviço de CEP: mostrar erro/orientação sem gerar `0,0` e permitir o fluxo manual quando aplicável.
- [ ] Tentar enviar latitude/longitude ausentes, não numéricas ou fora dos limites pela API: rejeitar dados inválidos sem persistir coordenadas incorretas.
- [ ] Conferir que ponto aproximado de CEP não é apresentado como entrada confirmada pelo usuário.

Observações:

## 5. Mobile — entregador e navegação

- [ ] Atribuir/aceitar uma entrega elegível: mostrar os controles de compartilhamento na entrega ativa.
- [ ] Iniciar compartilhamento explicitamente: solicitar as permissões necessárias e indicar o estado atual.
- [ ] Negar permissão ou iniciar com GPS desligado: não indicar compartilhamento ativo falsamente.
- [ ] Caminhar com o aparelho: enviar posições atuais sem erros recorrentes de precisão/formato da API.
- [ ] Ficar parado por alguns minutos: manter atualização periódica sem indicar desconexão apenas pela ausência de deslocamento.
- [ ] Pausar: parar imediatamente novos envios e refletir a pausa nos acompanhamentos após atualização.
- [ ] Retomar: iniciar uma nova sessão e voltar a transmitir.
- [ ] Abrir a entrega já atribuída após navegar para outra tela ou reabrir o app: permitir retomar explicitamente e mostrar o estado correto.
- [ ] Navegar até a retirada: abrir o aplicativo de mapas com o ponto confirmado da unidade.
- [ ] Navegar até o cliente: abrir o destino original do pedido, mesmo após edição do endereço salvo.
- [ ] Em pedido/unidade legados com coordenadas apenas do CEP: usar o endereço textual para navegação, sem tratar o centro do CEP como entrada exata.
- [ ] Sem aplicativo externo de mapas disponível: apresentar tratamento de falha, sem travar o app.

Observações:

## 6. Segundo plano — executar separadamente em Android e iOS

Se não houver aparelho de uma plataforma, registrar como BLOQUEADO; não marcar como aprovado. Encerrar o processo à força é diferente de colocar o app em segundo plano: não se espera rastreamento contínuo após encerramento forçado.

| Cenário | Android | iOS | Evidência/observações |
| --- | --- | --- | --- |
| Compartilhar com app aberto e caminhar | [ ] | [ ] | |
| Abrir Maps e caminhar por 3–5 minutos; observar posições no painel | [ ] | [ ] | |
| Bloquear a tela por 3–5 minutos; observar continuidade | [ ] | [ ] | |
| Voltar ao app; estado e controles devem continuar coerentes | [ ] | [ ] | |
| Pausar; indicador de uso contínuo de localização deve encerrar | [ ] | [ ] | |
| Desligar GPS e voltar ao app; informar falha e permitir retomada | [ ] | [ ] | |
| Revogar permissão durante compartilhamento; não travar | [ ] | [ ] | |
| Testar economia de bateria; registrar interrupções/restrições do sistema | [ ] | [ ] | |
| Encerrar app à força e reabrir; permitir retomada explícita | [ ] | [ ] | |

- [ ] Android: conferir notificação do serviço durante compartilhamento em segundo plano.
- [ ] iOS: conferir explicações de permissão e comportamento com o nível de permissão efetivamente concedido.

## 7. Mobile cliente e painel web — acompanhamento

- [ ] Cliente dono do pedido: abrir acompanhamento e visualizar entregador quando houver posição autorizada.
- [ ] Painel autorizado: abrir entrega e visualizar a mesma posição observada pelo cliente.
- [ ] Conferir ponto de destino do pedido quando disponível.
- [ ] Antes da primeira posição: mostrar ausência de localização, sem marcador fictício em `0,0`.
- [ ] Movimentar o entregador: atualizar marcador e horário da última posição.
- [ ] Abrir acompanhamento com posição antiga: não mostrar inicialmente como “ao vivo”.
- [ ] Desconectar o WebSocket mantendo HTTP disponível, usando ferramentas do navegador/proxy: acompanhamento deve se recuperar pela consulta periódica.
- [ ] Receber atualização HTTP atrasada após posição mais nova por socket: não fazer o marcador voltar para a posição antiga.
- [ ] No painel, desativar acompanhamento automático do mapa e mover/zoom: novas posições não devem desfazer a escolha do usuário; reativar e conferir centralização.
- [ ] Atualizar a página/sair e voltar ao acompanhamento: recuperar estado sem duplicar marcadores ou eventos.
- [ ] Abrir outro pedido: não exibir a posição do pedido anterior.
- [ ] Conferir estados sem localização, pausado, desatualizado e encerrado: textos e mapa devem ser coerentes.

Observações:

## 8. Rede, concorrência e encerramento

- [ ] Desligar internet do entregador durante envio: mostrar situação de conexão sem travar.
- [ ] Reconectar: transmitir posição atual, sem reproduzir uma fila de posições antigas como se fossem atuais.
- [ ] Pausar sem internet e reconectar: repetir a revogação pendente e manter compartilhamento encerrado.
- [ ] Pausar enquanto a requisição de iniciar ainda está pendente: a resposta atrasada não deve reativar GPS/envios; confirmar revogação após reconexão.
- [ ] Alternar rapidamente entre telas/entregas: respostas anteriores não devem substituir a entrega atual.
- [ ] Cancelar pedido com compartilhamento ativo: interromper rastreamento; API deve rejeitar novos envios.
- [ ] Concluir entrega: interromper rastreamento e não continuar publicando posições.
- [ ] Reatribuir do entregador A para B: revogar A, remover posição antiga e mostrar B somente após compartilhamento válido.
- [ ] Enviar evento atrasado de A depois da reatribuição: não substituir B nos mapas web/mobile.
- [ ] Pausar e retomar com o mesmo entregador: não recuperar posição da sessão anterior como posição da nova sessão.
- [ ] Fazer logout durante acompanhamento/compartilhamento: encerrar recursos locais e impedir exposição de dados na próxima conta.

Observações:

## 9. Acesso e validações — API/socket com contas de teste

Executar com Swagger, cliente HTTP ou testes automatizados quando a interface não permitir reproduzir o caso. Registrar o método usado. Não colocar tokens, senhas ou dados pessoais nas evidências commitadas.

- [ ] Outro cliente não consegue consultar ou assinar rastreamento do pedido alheio.
- [ ] Entregador não atribuído não consegue consultar/enviar localização daquele pedido, mesmo sendo membro da unidade.
- [ ] Usuário do painel sem permissão de entregas não consegue acompanhar.
- [ ] Remover permissão/desativar usuário enquanto socket está conectado: interromper acesso a novas posições.
- [ ] Token expirado: não continuar recebendo dados indefinidamente pela conexão aberta.
- [ ] Sem consentimento, com sessão revogada ou sessão de outro pedido: rejeitar envio.
- [ ] Enviar precisão nativa com várias casas decimais: aceitar quando dentro dos limites de qualidade.
- [ ] Enviar coordenadas inválidas, amostra antiga/futura, precisão ruim ou localização marcada como simulada: rejeitar conforme a política de validação.
- [ ] Repetir amostra, enviar fora de ordem ou em frequência excessiva: não persistir/publicar como nova posição válida.
- [ ] Simular salto geográfico incompatível com deslocamento normal: rejeitar conforme validação do backend.
- [ ] Consulta pública de açougues: conferir filtro/ordenação/paginação sem unidades duplicadas entre páginas.
- [ ] Em base isolada, conferir limpeza de posições vencidas pela política de retenção configurada.
- [ ] Em conta descartável/base isolada, testar exclusão da conta e conferir remoção/anonimização dos dados de localização relacionados.

Observações:

## 10. Encerramento e registro de falhas

- [ ] Revisar todos os itens não marcados e registrar motivo.
- [ ] Anexar evidências dos testes em aparelho real e horários para comparação com logs.
- [ ] Confirmar que pedidos de teste foram encerrados e nenhum aparelho continua compartilhando localização.
- [ ] Registrar abaixo bugs encontrados, corrigir e repetir o cenário antes de marcar como aprovado.
- [ ] Registrar resultado final: APROVADO / APROVADO COM RESSALVAS / REPROVADO.

| ID/item | Plataforma | Passos e pedido de teste | Esperado | Obtido | Evidência | Status/reteste |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

Rotas por ruas, ETA e distância rodoviária não são critérios de conclusão desta correção. As distâncias de proximidade não devem ser interpretadas como distância real percorrida por uma rota.

Resultado final:

Pendências e responsável:
