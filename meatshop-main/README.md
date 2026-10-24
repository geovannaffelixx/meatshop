
MEATSHOP

O MeatShop é um e-commerce de carnes, que conecta açougues e cliente em uma única plataforma.
Vendedor: Os vendedores podem cadastar seu açougue, gerenciar seus produtos, acompanhar pedidos e acessar relatórios e estatísticas de vendas.
Cliente: O cliente tem a possibilidade de visualizar os açougues disponíveis, navegar pelos produtos, fazer pedidos diretamente pelo aplicativo e acompanhar o status da compra.

O node.js e next.js são necessários para executar esse projeto. Para verificar se eles estão instalados, execute estes comandos no terminal:
node -v
npm -v

Caso não estejam, instale-os.

Após isso, inicie o servidor a partir de um dos comandos abaixo:

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

Abra [http://localhost:3000/login](http://localhost:3000/login) no seu navegador.

## Navegação e carregamento do painel

A sidebar usa links diretos agrupados por assunto, com um único acesso à conta. A unidade é selecionada no topo do menu; a troca bloqueia toda a interface por três segundos e reinicia o contexto das telas, incluindo formulários, notificações e cache.

Consultas usam TanStack Query em memória, com validade de cinco minutos e descarte após dez minutos sem uso. O cache é separado por sessão/unidade e pelos parâmetros da consulta. Alterações invalidam as leituras; logout, expiração de sessão e troca de unidade limpam o cache. Dados pessoais exportados, autenticação, pedidos e consultas de conversa/rastreamento não são reutilizados pelo cache geral. As atualizações periódicas de financeiro e entregas continuam buscando dados novos.

`DataSkeleton` compartilha os estados de leitura de listas, formulários e indicadores. Ao voltar a uma página com dados válidos em cache, ela exibe o conteúdo imediatamente. Pedidos consultam novamente a API em cada entrada. A verificação de termos é mantida por usuário/contexto, sem bloquear cada clique; exigências de novo aceite do backend continuam acionando o gate.

Para conferir: com uma conta que administra duas unidades, visitar Produtos → Categorias → Produtos e observar no Network que a consulta de produtos não se repete dentro de cinco minutos. Repetir com Pedidos: uma nova consulta deve ocorrer. Trocar de unidade e verificar a tela completa por três segundos e os dados da nova unidade. Em rede lenta, abrir uma tela ainda não carregada para observar o skeleton. Testar também erro/repetição, menu em 390 px e navegação por teclado.

`DataPagination` usa total conhecido de páginas, números, reticências e controles de primeira/anterior/próxima/última página; mantém a API usada pelas telas existentes. `ReusableTable<T>` centraliza apresentação de colunas, alinhamento, células personalizadas, identificação de linhas, skeleton, estado vazio e rodapé. Produtos usa a tabela sem ação na linha; apenas o botão Editar abre o formulário. Linhas interativas aceitam Enter/Espaço; botões e links internos mantêm a ação própria. As tabelas específicas restantes podem adotar a base conforme forem revisadas.

Categorias, Promoções e Equipe e acessos também usam `ReusableTable`, com dez registros por página. `useTablePagination` reinicia a página ao mudar filtros/contexto e ajusta o limite quando uma exclusão reduz os resultados. Nessas três telas, a paginação usa os registros retornados pela API em memória.

## Validações e datas compartilhadas

`shared/lib/validators.ts` centraliza CPF, CNPJ, e-mail, nome de pessoa, telefone, UF, CEP, senha e texto obrigatório. CPF/CNPJ conferem os dígitos verificadores; RG/CNH possuem apenas verificações de formato, sem consulta de emissão. O painel atual não possui campos de RG/CNH/telefone para edição; esses validadores ficam disponíveis para os respectivos formulários futuros. Campos de nome de unidade/fornecedor não recebem a restrição de nome de pessoa.

`input-masks.ts` reúne máscaras de CPF, CNPJ, documento misto e CEP. O CNPJ admite letras nas primeiras doze posições, preservadas pela máscara e normalização, conforme o [manual técnico da Receita Federal](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf). O contrato de criação de unidade do backend aceita esse formato normalizado.

`date-time.ts` usa `America/Sao_Paulo` para instantes e mantém datas de calendário sem deslocá-las para o dia anterior. Cadastro/recuperação/troca de senha, conta, equipe, unidade e despesas usam os validadores correspondentes; promoções, cupons, receitas e reagendamento usam validações de datas/períodos. A exibição de datas compartilha os utilitários. Datas futuras válidas são aceitas nos campos de planejamento.

As regras de `StatusDTO` do exemplo pertencem a etapas de venda configuráveis. Os status de pedidos deste projeto possuem regras próprias e não usam esse modelo. Utilitários de dias úteis e ativação de contas do outro projeto não foram conectados a fluxos sem esse conceito no MeatShop.


## Ajustes de interface e validação

A identidade na sidebar mostra `avatar_url`, com a inicial como alternativa quando não há foto ou quando ela falha. Mensagens usa o cabeçalho de Operação.

A exportação na conta é temporariamente uma prévia: abre um modal com Excel, JSON e PDF e mostra um toast de demonstração. Nenhum desses botões faz requisição ou baixa arquivo nesta etapa. O endpoint de exportação permanece no backend para a integração futura.

`API_CACHE_STALE_TIME` centraliza os cinco minutos para chamadas diretas e hooks. Depois desse prazo, a próxima consulta busca a API novamente; não há uma busca automática por expiração enquanto a tela está parada. O descarte de consultas inativas continua em dez minutos. Polling existente e exclusões de cache permanecem.

`validation-schemas.ts` usa [Zod](https://zod.dev/api) e reaproveita as regras de documento e negócio de `validation-rules.ts`. A API de `validators.ts` usa `safeParse`, mantendo os formulários existentes integrados. A conta também usa um schema de objeto com erros por campo e normalização. O backend mantém sua validação com class-validator.

`Loading` e `LoadingPointer` adaptam os exemplos de progresso para Tailwind, com paleta vermelha, sem Chakra/Emotion e respeitando movimento reduzido. A troca de unidade usa os pontos animados; leituras continuam com skeleton. `LoadingOverlay` permite progresso opcional sem alterar o skeleton padrão.
