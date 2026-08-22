# Releases do backend

## 1.1.0 — Acesso administrativo por unidade

Lançada em 21 de agosto de 2026.

Esta versão separa o perfil do aplicativo móvel das funções do painel web. O acesso administrativo passa a depender de vínculo ativo com cada unidade.

- Proprietário: controle integral da unidade.
- Gerente: operação completa e gestão de equipe, sem alterar propriedade.
- Operador: pedidos, estoque e categorias, sem dados financeiros.
- Entregador: permanece no fluxo móvel e não acessa o painel.
- Superadministrador: acesso global com escolha da unidade.

A implantação exige executar a migration `ReplaceUnitLocalRoles1787400000000` antes de disponibilizar a nova API.
