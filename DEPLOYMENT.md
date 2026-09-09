# Deploy gratuito da branch `develop`

## Endereços recomendados

- Painel web: `https://app.seudominio.com.br` (Vercel)
- API e WebSocket: `https://api.seudominio.com.br` (Render)

Os dois subdomínios sob o mesmo domínio permitem cookies seguros com `SameSite=Lax`.

## Render (backend e PostgreSQL)

1. Conecte este repositório no Render e crie um Blueprint usando `render.yaml`.
2. Preencha todas as variáveis marcadas como `sync: false` antes do primeiro deploy.
3. Cadastre `api.seudominio.com.br` como custom domain do serviço.
4. Use `https://app.seudominio.com.br` em `FRONTEND_URL` e `CORS_ORIGINS`.
5. Use `https://api.seudominio.com.br` em `BACKEND_PUBLIC_URL`.

O Blueprint executa as migrations antes de iniciar a API e só publica a `develop` depois que o CI passar.

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

## Mobile

Copie `.env.render.example` para `.env.render`, substitua a URL provisória pela URL real da Render e gere o APK com:

```bash
flutter build apk --release --dart-define-from-file=.env.render
```

O mobile usa `MEATSHOP_API_URL`; o segredo do Cloudinary e a chave do Resend pertencem somente ao backend.

## Limites importantes

Os planos gratuitos servem bem para demonstração, mas o backend da Render pode hibernar e o primeiro acesso demora mais. O PostgreSQL gratuito da Render expira, não possui backup e precisa ser recriado/migrado periodicamente. Não trate essa configuração como produção comercial.
