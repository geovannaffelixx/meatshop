# Manual de Qualidade

**Data da criação:** 10 de dezembro de 2025 por Rafael Souto Sena

**Última revisão:** 11 de dezembro de 2025 por Rafael Souto Sena

### **Padrões para garantir qualidade, escalabilidade e sustentabilidade de sistemas**

# **1. Arquitetura e Estrutura do Sistema**

### **1.1. Arquitetura Limpa**

Exigir sempre:

- **Controller**
    - Recebe requisições do usuário ou do cliente.
    - Valida entrada e encaminha para o **Use Case**.
    - **Não deve conter regras de negócio.**
- **Use Case / Service**
    - Contém a **lógica de aplicação** (regras do negócio).
    - Orquestra chamadas entre Domain e Repositórios.
- **Domain / Model**
    - Representa o **núcleo do negócio** (entidades e regras centrais).
    - Independente de frameworks, banco de dados ou detalhes de implementação.
- **Repository / Gateway**
    - Interface entre Domain e camada de persistência.
    - Responsável por salvar, buscar e atualizar dados.

### **1.2. Uso correto de padrões**

- **SOLID** → Princípios para escrever código limpo e extensível
- **DRY (Don’t Repeat Yourself)** → Evitar repetição de código
- **KISS (Keep It Simple)** → Manter o código simples e direto
- **YAGNI (You Ain’t Gonna Need It)** → Não implementar funcionalidades que não são necessárias

### **1.3. Exemplo de Estrutura (Genérica)**

```
/src
  /modules        -> Funcionalidades divididas por contexto
  /core           -> Regras de negócio e serviços centrais
  /shared         -> Componentes/utilidades reutilizáveis
  /config         -> Configurações da aplicação
  /infra          -> Integrações externas e infraestrutura
  /tests          -> Testes automatizados

```

# **2. Qualidade do Código**

### **2.1. Código limpo**

O time deve garantir:

- Nomes claros e descritivos
- Zero linhas “mágicas” ou códigos obscuros
- Nenhuma função com mais de **40 linhas**
- Nenhuma classe com múltiplas responsabilidades

### **2.2. Comentários**

Permitir apenas quando:

- For informação relevante
- Houver explicação de regra complexa

Proibir:

- Comentários que explicam o óbvio
- Deixar blocos grandes de código comentado

# **3. Segurança**

### **3.1. Princípios obrigatórios**

- Zero dados sensíveis no código-fonte
- Variáveis de ambiente com acesso controlado
- Criptografia forte para dados sensíveis em repouso e em trânsito
- Logs de auditoria

### **3.2. Auditoria automática**

Pipeline deve executar:

- npm audit ou equivalente
- Snyk (ou ferramenta equivalente de verificação de vulnerabilidades)
- Linter de segurança, quando aplicável

Nenhum PR deve ser aprovado se houver falhas críticas ou altas pendentes.

### **3.3. Conformidade com normas**

- LGPD
- HIPAA (para saúde)
- Boas práticas OWASP, especialmente:
    - OWASP Top 10
    - API Security Top 10
    - Secure Coding Guidelines

# **4. Desempenho e Escalabilidade**

### **4.1. Banco de dados**

Ficar atento:

- Índices adequados
- Queries plan (verificar N+1)
- Estrutura normalizada
- Migrations bem organizadas e com rollback seguro
- Controle no Número de Leituras

### **4.2. API responsiva**

Meta:

- Resposta < 200 ms em endpoints simples
- Resposta < 500 ms em endpoints complexos

### **4.3. Escalabilidade**

O sistema deve suportar:

- Balanceamento horizontal
- Cache
- Filas quando necessário

# **5. Frontend e UX**

### **5.1. UI deve seguir:**

- Guia de estilo centralizado
- Componentes reutilizáveis
- Congruência visual

### **5.2. Feedback do sistema**

O usuário sempre deve ter retorno sobre:

- Sucesso
- Erro
- Carregando

### **5.3. Acessibilidade**

Garantir:

- Contraste
- Alternativas de navegação
- Tamanho mínimo de fonte

# **6. Observabilidade**

### **6.1. Logs**

Devem incluir:

- Operações críticas
- ID do usuário
- Horário
- Dados importantes (sem informações sensíveis)

### **6.2. Monitoramento**

Obrigatório:

- CPU
- RAM
- Latência
- Erros
- Throughput

### **6.3. Alertas**

Criar alertas automáticos para:

- Falha no login em massa
- Degradação da performance
- Erros 500 em sequência
- Falha na fila de processamento

# **7. Processo de Code Review**

### **7.1. O que o revisor deve confirmar**

- O código está legível?
- A solução resolve o problema correto?
- Há risco de quebra?
- Há riscos de performance?
- Há riscos de segurança?
- Há duplicação de lógica?

### **7.2. O que o revisor não deve permitir**

- Código complexo sem necessidade
- Funções enormes
- PRs gigantes (> 400 linhas)
- Falta de documentação

# **8. Documentação**

O sistema **nunca é considerado completo** sem:

- Diagrama de arquitetura
- DER/MER
- Fluxos principais
- Documentação de endpoints
- Guia de deploy
- Padrões de código
- Logs de decisões técnicas

# **9. Checklist Semanal do Gestor**

Toda semana, você deve verificar:

### **Arquitetura**

- Módulos continuam desacoplados
- Pastas organizadas
- Nada de lógica nos controllers

### **Qualidade**

- Pipeline estável
- PRs com evidências e descrição

### **Banco de dados**

- Sem queries pesadas
- Migrations consistentes

### **Segurança**

- Auditoria automática passou
- Tokens e secrets protegidos

### **Performance**

- Latência dentro dos limites
- Sem gargalos identificados

### **Documentação**

- Swagger atualizado
- Fluxos atualizados

# **10. Regras que nunca podem ser quebradas**

❌ Push direto na main

❌ PR sem revisão

❌ Código sem documentação

❌ Função com responsabilidade múltipla

❌ Endpoint sem validação

❌ Dados sensíveis sem criptografia

❌ Falta de logs de erro

# **11. Nossos Princípios**

1. **Se não está documentado, não existe.**
2. **Se não tem teste, não está pronto.**
3. **Se não está padronizado, não será escalado.**
4. **Se não pode ser monitorado, não pode ser confiado.**
5. **Se não é seguro, não deve ser lançado.**


# Padrão de versões

**Data da criação:** 10 de dezembro de 2025 por Rafael Souto Sena

**Última revisão:** 10 de dezembro de 2025 por Rafael Souto Sena

# **1. Estrutura de Versões**

Usar **Semantic Versioning** :

```
MAJOR.MINOR.PATCH
```

### **Regras**

- **MAJOR** → incrementado quando houver mudanças que quebram compatibilidade.
- **MINOR** → incrementado ao adicionar novas funcionalidades compatíveis com versões anteriores.
- **PATCH** → incrementado para correções de bugs ou ajustes internos sem impacto no uso.

### **Exemplos:**

```
1.0.0 → versão inicial do projeto
1.1.0 → nova funcionalidade sem breaking change
1.1.1 → correção de bug
2.0.0 → mudança que quebra compatibilidade com versões anteriores
```

# Padrões Commit, PR e **Branches**

**Data da criação:** 10 de dezembro de 2025 por Rafael Souto Sena

**Última revisão:** 11 de dezembro de 2025 por Rafael Souto Sena

## 1. Branches

Modelo simplificado baseado no GitFlow.

### 1.1. Branches principais

```
main        → código estável (produção)
develop     → integração contínua das sprints
```

**Branch protection (main)**

- Exigir Pull Request
- Exigir 1 aprovação
- CI obrigatório
- Commits assinados
- Proibido push direto
- Histórico linear obrigatório

**Branch protection (develop)**

- Exigir Pull Request
- Exigir 1 aprovação
- CI obrigatório

### 1.2. Branches de funcionalidades

**Formato:** feature/descricao-resumida

**Exemplos:**

```
feature/create-user-module
feature/patient-daily-tracking
feature/chat-realtime
feature/report-generation
```

### 1.3. Branches de correções

**Formato:** fix/descricao-resumida

**Exemplos:**

```
fix/login-token-expiration
fix/patient-report-date-bug
```

### 1.4. Branches de hotfix (produção)

**Formato:** hotfix/descricao-resumida

**Exemplos:**

```
hotfix/critical-auth-error
hotfix/patient-data-encryption
```

### 1.5. Branches de release

**Formato:** release/identificacao

**Exemplos:**

```
release/sprint-3
release/v1.0.0
```

## 2. Commits

Todos os commits devem ser escritos em inglês.

### 2.1. As sete regras de um bom commit Git

1. Separe o assunto do corpo com uma linha em branco
2. Limite a linha de assunto a 50 caracteres
3. Capitalize a linha de assunto
4. Não termine a linha de assunto com ponto final
5. Use o modo imperativo na linha de assunto
6. Quebre o corpo em 72 caracteres
7. Use o corpo para explicar o que e por que, não como

### 2.2. Formato geral

```
<type>(scope): descrição clara
```

### 2.3. Tipos permitidos

| Tipo | Uso |
| --- | --- |
| feat | Nova funcionalidade |
| fix | Correção de bug |
| docs | Documentação |
| style | Formatação, sem alteração de lógica |
| refactor | Refatoração sem mudança de comportamento |
| test | Testes |
| chore | Manutenção geral |
| perf | Melhoria de performance |
| ci | Alterações no CI/CD |
| build | Dependências |

### 2.4. Exemplos de commits

```
feat(users): create user registration endpoint
fix(auth): correct refresh token expiration bug
docs(readme): update project documentation
test(reports): add e2e tests for PDF generation
refactor(patients): simplify validation logic

```

### 2.5. Estrutura detalhada do commit

**Linha de Assunto (Resumo):**

- Mantenha conciso, resumindo a alteração em cerca de 50 caracteres ou menos
- Use o modo imperativo (ex: "Add" não "Added" ou "Adds")

**Corpo:**

- Forneça uma explicação mais detalhada do commit
- Foque no porquê da mudança, não no como
- Descreva quaisquer detalhes relevantes ou decisões tomadas durante a implementação
- Use pontos de tópico para organizar informações adicionais

### 2.6. Passo a passo no terminal

**Passo 1: Certifique-se de estar na branch correta ou crie uma nova branch**

```bash
git checkout <nome-da-sua-branch>

```

Ou crie uma nova branch:

```bash
git checkout -b feature/nova-funcionalidade

```

**Passo 2: Faça as alterações no código**

Implemente as alterações necessárias nos arquivos do projeto.

**Passo 3: Adicione as alterações ao staging area**

```bash
git add .

```

Para adicionar arquivos específicos:

```bash
git add <nome-do-arquivo>

```

**Passo 4: Faça o commit com a mensagem apropriada**

```bash
git commit -m "feat(users): add alphabetical sorting to user profiles"

```

## 3. Pull Requests

Todos os pull requests devem ser escritos em inglês.

### 3.1. Título

Um título conciso e descritivo que resume o propósito do pull request.

### 3.2. Descrição

- Uma explicação detalhada das alterações feitas no pull request
- Articular claramente os problemas de negócios e técnicos abordados pelas alterações
- Fornecer uma visão geral breve da solução adotada

### 3.3. Mudanças Propostas

- Enumerar as alterações específicas feitas no código
- Incluir detalhes sobre novos recursos, correções de bugs ou melhorias

### 3.4. Problema de Negócio

- Explicar o problema de negócios ou requisito que motivou essas alterações
- Relacionar as alterações aos objetivos gerais ou necessidades do projeto

### 3.5. Problema Técnico

- Descrever quaisquer desafios técnicos ou deficiências no código existente que essas alterações abordam
- Discutir a motivação por trás da escolha de uma solução específica

### 3.6. Aprovação Necessária

- Especificar as pessoas ou funções que precisam aprovar o pull request
- Se aplicável, mencionar se a aprovação de mantenedores ou membros específicos da equipe é necessária

### 3.7. Checklist

Listar itens específicos que os revisores devem verificar antes de aprovar o pull request.

### 3.8. Notas Adicionais

- Qualquer informação adicional que seja relevante, mas não se encaixe nas seções anteriores
- Considere mencionar qualquer impacto potencial no desempenho ou em outras áreas da aplicação

### 3.9. Exemplo completo

```markdown
**Title:** Implement User Authentication

**Description:**
This pull request addresses the need for user authentication in the
application. The implementation includes updates to the authentication
service and user model.

**Proposed Changes:**
- Added authentication middleware
- Updated user model to include encrypted passwords
- Implemented login and registration endpoints

**Business Problem:**
Users require a secure and reliable way to access the application. This
feature fulfills the business requirement for implementing user
authentication.

**Technical Problem:**
The previous authentication mechanism was vulnerable to security issues.
This update introduces a more robust solution using bcrypt for password
encryption.

**Required Approval:**
- Approval from a team maintainer

**Checklist:**
- [x] All automated tests are passing
- [x] Documentation has been updated
- [x] Code follows team coding standards
- [ ] Peer review is required

**Additional Notes:**
The new authentication system depends on the latest version of bcrypt to
enhance security.

```
