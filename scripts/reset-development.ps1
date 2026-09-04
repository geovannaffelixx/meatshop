param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('meatshop')]
  [string]$ConfirmProject
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = Join-Path $repositoryRoot 'docker-compose.yml'
if (-not (Test-Path -LiteralPath $composeFile)) { throw 'docker-compose.yml not found' }
if ($ConfirmProject -ne 'meatshop') { throw 'Project confirmation mismatch' }

Push-Location $repositoryRoot
try {
  docker compose down --remove-orphans
  if ($LASTEXITCODE -ne 0) { throw 'Failed to stop the local stack' }

  $databaseVolume = 'meatshop_pgdata'
  $volumeJson = docker volume inspect $databaseVolume 2>$null
  if ($LASTEXITCODE -eq 0) {
    $volumeInfo = $volumeJson | ConvertFrom-Json
    $composeProject = $volumeInfo[0].Labels.'com.docker.compose.project'
    if ($composeProject -ne 'meatshop') { throw "Refusing to remove unexpected volume $databaseVolume" }
    docker volume rm $databaseVolume
    if ($LASTEXITCODE -ne 0) { throw 'Failed to remove the PostgreSQL development volume' }
  }

  docker compose build backend frontend
  if ($LASTEXITCODE -ne 0) { throw 'Failed to build local images' }
  docker compose up -d db
  if ($LASTEXITCODE -ne 0) { throw 'Failed to start PostgreSQL' }
  docker compose run --rm migrator
  if ($LASTEXITCODE -ne 0) { throw 'Migrations failed' }
  docker compose run --rm -e NODE_ENV=development -e SEED_ENABLED=true backend npm run seed:run
  if ($LASTEXITCODE -ne 0) { throw 'Development seed failed' }
  docker compose up -d backend frontend
  if ($LASTEXITCODE -ne 0) { throw 'Failed to start the application' }
  docker compose ps
} finally {
  Pop-Location
}
