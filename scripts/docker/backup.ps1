#Requires -Version 7
<#
.SYNOPSIS
  Sauvegarde horodatée de Portfolio 2.0 : base portfolio_v2 + volumes médias/état.

.DESCRIPTION
  Lecture seule sur les données : mariadb-dump --single-transaction (cohérent,
  sans verrou bloquant) depuis un conteneur client jetable, archives tar des
  volumes montés en lecture seule. Produit dans <Destination>/<horodatage>/ :
    portfolio_v2.sql.gz   dump SQL (structure + données, sans CREATE DATABASE)
    media.tar.gz          contenu du volume portfolio_v2_media
    media.sha256          empreintes des fichiers du volume (contrôle après restauration)
    state.tar.gz, state.sha256   idem pour portfolio_v2_state (sauf -SkipState)
    SHA256SUMS            empreintes des archives (vérifiables par `sha256sum -c` sous Linux)
  Le dossier produit est autonome : le copier hors de la machine (disque externe, cloud).
#>
param(
  [string]$Destination = (Join-Path $env:USERPROFILE "Backups/portfolio-v2"),
  [string]$EnvFile = (Join-Path $PSScriptRoot "../../.env.docker"),
  [switch]$SkipState,
  [string]$HelperImage = "node:22-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee",
  # Client identique au serveur : image du conteneur `db` (aucune action sur ce conteneur).
  [string]$ClientImage = (docker inspect db --format "{{.Image}}")
)
$ErrorActionPreference = "Stop"

function Invoke-Docker {
  & docker @args
  if ($LASTEXITCODE -ne 0) { throw "docker $($args[0]) a échoué ($LASTEXITCODE)." }
}

# DATABASE_URL lue dans le fichier d'environnement, jamais affichée.
$line = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
if (-not $line) { throw "DATABASE_URL absente de $EnvFile." }
$url = [Uri](($line -split '=', 2)[1].Trim().Trim('"'))
$user, $password = $url.UserInfo.Split(':', 2) | ForEach-Object { [Uri]::UnescapeDataString($_) }
$database = $url.AbsolutePath.TrimStart('/')
if ($database -ne "portfolio_v2") { throw "Base inattendue : $database." }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $Destination $stamp
New-Item -ItemType Directory -Path $target | Out-Null
Write-Host "Sauvegarde vers $target"

# 1. Base : mot de passe transmis par variable d'environnement (absent de la ligne de commande).
$env:MYSQL_PWD = $password
try {
  Invoke-Docker run --rm --add-host "host.docker.internal:host-gateway" -e MYSQL_PWD `
    -v "${target}:/backup" $ClientImage bash -o pipefail -c `
    "mariadb-dump -h '$($url.Host)' -P $($url.Port) -u '$user' --single-transaction --quick --no-tablespaces --routines --triggers --default-character-set=utf8mb4 '$database' | gzip -9 > /backup/portfolio_v2.sql.gz"
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
Write-Host "Base : portfolio_v2.sql.gz"

# 2. Volumes, montés en lecture seule.
$volumes = @(@{ Name = "portfolio_v2_media"; Prefix = "media" })
if (-not $SkipState) { $volumes += @{ Name = "portfolio_v2_state"; Prefix = "state" } }
foreach ($volume in $volumes) {
  $prefix = $volume.Prefix
  Invoke-Docker run --rm -v "$($volume.Name):/v:ro" -v "${target}:/backup" $HelperImage sh -c `
    "cd /v && find . -type f -exec sha256sum {} + | sort -k2 > /backup/$prefix.sha256 && tar -czf /backup/$prefix.tar.gz --numeric-owner ."
  $count = (Get-Content (Join-Path $target "$prefix.sha256") | Measure-Object -Line).Lines
  Write-Host "Volume $($volume.Name) : $prefix.tar.gz ($count fichier(s))"
}

# 3. Empreintes des archives, au format sha256sum (fin de ligne LF).
$sums = Get-ChildItem -LiteralPath $target -File | Sort-Object Name | ForEach-Object {
  "$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower())  $($_.Name)"
}
[IO.File]::WriteAllText((Join-Path $target "SHA256SUMS"), ($sums -join "`n") + "`n")

Get-ChildItem -LiteralPath $target | Format-Table Name, Length -AutoSize
Write-Host "Terminé. Vérifier avec : scripts/docker/verify-backup.ps1 -Path '$target'"
