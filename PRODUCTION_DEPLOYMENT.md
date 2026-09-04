# Deploy de produção — MeatShop 3.0.0

Este documento é o gate operacional para publicar backend e painel. O Compose da raiz é exclusivo para desenvolvimento e demonstração; não reutilize suas credenciais em produção.

## Infraestrutura obrigatória

- Node.js 22 LTS, PostgreSQL 17 gerenciado e armazenamento persistente para uploads.
- TLS válido no domínio do painel e da API, proxy reverso com limite de corpo e timeout definidos.
- Segredos em um secret manager, nunca em imagem, repositório, log ou variável pública do Next.js.
- Backups criptografados do PostgreSQL com retenção definida e restauração testada.
- Ambientes isolados para homologação e produção, incluindo projetos Firebase e credenciais Mercado Pago.

## Configuração da API

Defina NODE_ENV=production, DB_TYPE=postgres, DB_SYNCHRONIZE=false, DB_SSL=true, COOKIE_SECURE=true, FRONTEND_URL e CORS_ORIGINS somente com URLs HTTPS autorizadas. Use valores aleatórios fortes e independentes para JWT_SECRET, JWT_REFRESH_SECRET, DELIVERY_CODE_SECRET e DELIVERY_CODE_ENCRYPTION_KEY.

Configure ainda:

- FIREBASE_SERVICE_ACCOUNT e FIREBASE_APP_CHECK_ENFORCED=true;
- FIREBASE_APP_CHECK_PROTECTED_PATHS=/auth/firebase-exchange;
- MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET e MP_ENV=production;
- SMTP real em MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASSWORD e MAIL_FROM;
- BACKEND_PUBLIC_URL, TRUST_PROXY=true, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX e DELIVERY_TRACKING_RETENTION_DAYS;
- diretórios ou serviços externos para logs e uploads, com acesso mínimo necessário.

A aplicação falha na inicialização quando detecta configuração insegura de produção. Para múltiplas réplicas, mantenha o limite local como proteção adicional e aplique também rate limiting distribuído no ingress ou API gateway.

## Ordem de publicação

1. Gere backup e valide a restauração no ambiente de homologação.
2. Construa imagens imutáveis a partir do commit aprovado.
3. Execute npm ci, auditoria, lint, typecheck, testes, build e migrations no CI.
4. Publique primeiro a API, execute npm run migration:run:prod uma única vez e valide /health.
5. Publique o painel com NEXT_PUBLIC_API_URL apontando para a API HTTPS.
6. Libere tráfego gradualmente e acompanhe disponibilidade, taxa de erros e latência.

Migrations nunca devem usar synchronize. Se uma migration falhar, interrompa a publicação e restaure a versão anterior; não force alterações manuais no schema.

## Gates de aceite

- npm audit --omit=dev --audit-level=high em backend e painel;
- lint, typecheck, testes unitários, cobertura e testes E2E;
- build Docker e migrations partindo de banco vazio;
- smoke de 100 requisições com p95 abaixo de 200 ms em /health;
- login, renovação, logout, permissões, checkout sandbox, webhook assinado, entrega, chat e push homologados;
- App Check real em Android e iOS e bloqueio de atestado inválido;
- exclusão de conta, anonimização, retenção de localização e atendimento LGPD validados;
- dashboards e alertas enviados a um canal atendido pela equipe.

## Observabilidade e resposta

Importe prometheus-alerts.yml, centralize logs estruturados e remova dados pessoais antes da ingestão. Defina responsáveis, escalonamento e objetivos de disponibilidade. Teste alertas de backend indisponível, 5xx, p95 elevado e pico de falhas de login.

## Rollback

- mantenha a imagem anterior identificada pelo SHA do commit;
- migrations destrutivas exigem estratégia expand/contract e rollback ensaiado;
- reverta o tráfego para a imagem anterior antes de qualquer restauração de banco;
- registre incidente, período afetado, decisão e evidências sem copiar tokens ou dados pessoais.

## O que depende do ambiente

O código e os gates automatizados deixam o produto preparado para publicação. Domínios, certificados, contas de nuvem, credenciais reais, políticas organizacionais de retenção e execução do deploy precisam ser preenchidos antes da abertura ao público.

## Risco transitivo monitorado

A auditoria do backend não possui achados altos ou críticos. O Firebase Admin 14 ainda traz seis ocorrências moderadas do advisory de UUID por dependências transitivas do Google Cloud. O código MeatShop não chama as variantes UUID afetadas nem fornece buffers a elas. Forçar a correção sugerida pelo npm faria downgrade para Firebase Admin 10; por isso, o risco é monitorado no CI e deve ser removido assim que o upstream publicar uma árvore compatível.
