# Deploy gratuito da branch `develop`

## Endereços recomendados

- Painel web: `https://app.seudominio.com.br` (Vercel)
- API e WebSocket: `https://api.seudominio.com.br` (Render)
- Chatbot interno: serviço Render separado, sem acesso direto pelo mobile ou painel

Os dois subdomínios sob o mesmo domínio permitem cookies seguros com `SameSite=Lax`. Enquanto forem usados os domínios gratuitos `vercel.app` e `onrender.com`, use `SameSite=None`.

## Render (backend e PostgreSQL)

1. Conecte este repositório no Render e crie um Blueprint usando `render.yaml`.
2. Preencha todas as variáveis marcadas como `sync: false` antes do primeiro deploy.
3. Cadastre `api.seudominio.com.br` como custom domain do serviço.
4. Use `https://app.seudominio.com.br` em `FRONTEND_URL` e `CORS_ORIGINS`.
5. Use `https://api.seudominio.com.br` em `BACKEND_PUBLIC_URL`.

O Blueprint executa as migrations antes de iniciar a API e só publica a `develop` depois que o CI passar.

## Render (chatbot)

1. Conecte o repositório `meatshop-chatbot` e use o `render.yaml` dele.
2. Configure `GROQ_API_KEY` e gere um valor forte para `SERVICE_API_KEY`.
3. No serviço `meatshop-api`, informe a URL HTTPS do chatbot em `AI_CHATBOT_URL`.
4. Copie exatamente o mesmo `SERVICE_API_KEY` para `AI_CHATBOT_SERVICE_KEY` no backend.

O chatbot não acessa o PostgreSQL. Histórico, autenticação, retenção de sete dias e limite por
usuário permanecem no backend principal.

## Cloudinary (imagens)

Crie uma conta gratuita e copie `Cloud name`, `API key` e `API secret` para as variáveis `CLOUDINARY_*` no Render. Nunca exponha o `API secret` no frontend ou no mobile.

## Resend (e-mail sem SMTP)

1. Crie uma conta gratuita no Resend.
2. Valide o domínio de envio adicionando os registros DNS fornecidos pelo Resend.
3. Crie uma API key e configure `RESEND_API_KEY` e `RESEND_FROM`, por exemplo `MeatShop <no-reply@seudominio.com.br>`.

O backend usa a API HTTPS do Resend em produção e preserva SMTP como alternativa para desenvolvimento local.

## Vercel (painel web)

1. Importe o mesmo repositório e selecione `meatshop-main` como Root Directory.
2. Defina `develop` como Production Branch.
3. Configure `NEXT_PUBLIC_API_URL=https://api.seudominio.com.br`.
4. Cadastre `app.seudominio.com.br` como custom domain.

## Mercado Pago

O Blueprint inicia com `PAYMENTS_ENABLED=false`, portanto a demonstração funciona sem credenciais. As rotas de pagamento respondem como indisponíveis até configurar as credenciais. Para ativar depois, defina `PAYMENTS_ENABLED=true`, `MP_ENV=production`, `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` na Render.

## Mobile

Copie `.env.render.example` para `.env.render`, substitua a URL provisória pela URL real da Render e gere o APK com:

```bash
flutter build apk --release --dart-define-from-file=.env.render
```

O mobile usa `MEATSHOP_API_URL`; o segredo do Cloudinary e a chave do Resend pertencem somente ao backend.

## Limites importantes

Os planos gratuitos servem bem para demonstração, mas o backend da Render pode hibernar e o primeiro acesso demora mais. O PostgreSQL gratuito da Render expira, não possui backup e precisa ser recriado/migrado periodicamente. Não trate essa configuração como produção comercial.
