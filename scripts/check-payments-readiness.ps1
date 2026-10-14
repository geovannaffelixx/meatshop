param([string]$EnvFile = '.env.payments.local', [switch]$ConfigurationOnly)
$ErrorActionPreference = 'Stop'
$values = @{}
foreach ($line in Get-Content -LiteralPath $EnvFile) {
  if ($line -match '^\s*([A-Z_]+)\s*=(.*)$') {
    $values[$Matches[1]] = $Matches[2].Trim().Trim([char]34, [char]39)
  }
}
foreach ($name in @('MP_CLIENT_ID','MP_CLIENT_SECRET','MP_OAUTH_REDIRECT_URI','MP_CREDENTIAL_ENCRYPTION_KEY','MP_WEBHOOK_SECRET','BACKEND_PUBLIC_URL','FRONTEND_URL','NEXT_PUBLIC_API_URL','CORS_ORIGINS')) {
  if ([string]::IsNullOrWhiteSpace($values[$name])) { throw "Configure $name in $EnvFile" }
}
if ($values['PAYMENTS_ENABLED'] -ne 'true') { throw 'PAYMENTS_ENABLED must be true for checkout homologation' }
if ($values['MP_ENV'] -notin @('sandbox','production')) { throw 'MP_ENV must be sandbox or production' }
foreach ($name in @('MP_CREDENTIAL_ENCRYPTION_KEY','MP_WEBHOOK_SECRET')) {
  if ($values[$name].Length -lt 32) { throw "$name must contain at least 32 characters" }
}
foreach ($name in @('BACKEND_PUBLIC_URL','FRONTEND_URL','NEXT_PUBLIC_API_URL','MP_OAUTH_REDIRECT_URI')) {
  $uri = [Uri]$values[$name]
  if (-not $uri.IsAbsoluteUri -or $uri.Scheme -ne 'https' -or $uri.Host -match '(^|\.)example\.com$|^localhost$|^127\.') { throw "Set a real public HTTPS address for $name" }
}
if ($values['MP_OAUTH_REDIRECT_URI'].TrimEnd('/') -ne ($values['BACKEND_PUBLIC_URL'].TrimEnd('/') + '/payments/sellers/oauth/callback')) { throw 'OAuth redirect must point to the configured backend callback' }
Write-Output 'Payment configuration: OK (credentials are not displayed)'
if (-not $ConfigurationOnly) {
  $backend = $values['BACKEND_PUBLIC_URL'].TrimEnd('/')
  $frontend = $values['FRONTEND_URL'].TrimEnd('/')
  $capabilities = Invoke-RestMethod -Uri "$backend/mercadopago/capabilities" -TimeoutSec 20
  if (-not $capabilities.online) { throw 'The deployed backend has not enabled online payments' }
  $response = Invoke-WebRequest -Uri "$frontend/payment-return" -UseBasicParsing -TimeoutSec 20
  if ($response.StatusCode -ne 200) { throw 'Public payment return page is unavailable' }
  Write-Output 'Public checkout capabilities and return page: OK'
}
Write-Output 'Next: connect test sellers in Finance and execute the acceptance matrix in docs/PAYMENTS_SETUP.md.'
