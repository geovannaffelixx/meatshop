param(
  [string]$ServiceAccountPath = (Join-Path $PSScriptRoot '..\secrets\firebase-service-account.json')
)

$ErrorActionPreference = 'Stop'
$expectedProjectId = 'meatshop-3c78f'

if (-not (Test-Path -LiteralPath $ServiceAccountPath -PathType Leaf)) {
  throw "Credencial não encontrada em '$ServiceAccountPath'. Baixe a conta de serviço do Firebase e salve-a nesse caminho."
}

$resolvedPath = (Resolve-Path -LiteralPath $ServiceAccountPath).Path
$serviceAccount = Get-Content -LiteralPath $resolvedPath -Raw | ConvertFrom-Json

if ($serviceAccount.type -ne 'service_account') {
  throw 'O arquivo informado não é uma conta de serviço do Google.'
}

if ($serviceAccount.project_id -ne $expectedProjectId) {
  throw "A conta de serviço pertence ao projeto '$($serviceAccount.project_id)', mas o mobile usa '$expectedProjectId'."
}

if (-not $serviceAccount.client_email -or -not $serviceAccount.private_key) {
  throw 'A conta de serviço não contém client_email e private_key.'
}

$env:FIREBASE_SERVICE_ACCOUNT = $serviceAccount | ConvertTo-Json -Compress -Depth 20
try {
  docker compose --project-directory (Join-Path $PSScriptRoot '..') up -d --build
  docker compose --project-directory (Join-Path $PSScriptRoot '..') ps
} finally {
  Remove-Item Env:FIREBASE_SERVICE_ACCOUNT -ErrorAction SilentlyContinue
}
