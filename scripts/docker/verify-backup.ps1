#Requires -Version 7
<#
.SYNOPSIS
  Vérifie une sauvegarde produite par backup.ps1 par restauration ISOLÉE.

.DESCRIPTION
  - Contrôle les empreintes des archives (SHA256SUMS).
  - Restaure chaque archive de volume dans un volume TEMPORAIRE, compare chaque
    fichier à <prefix>.sha256, puis supprime ce volume temporaire.
  - Avec -WithDatabase : importe le dump dans un conteneur MariaDB ÉPHÉMÈRE
    (même image que `db`, sans port publié, réseau isolé, données en mémoire,
    supprimé à la fin) et compte les lignes des tables principales.
  Jamais d'écriture sur portfolio_v2, sur le conteneur `db` ni sur les volumes réels.
#>
param(
  [Parameter(Mandatory)] [string]$Path,
  [switch]$WithDatabase,
  [string]$HelperImage = "node:22-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee",
  [string]$ServerImage = (docker inspect db --format "{{.Image}}")
)
$ErrorActionPreference = "Stop"
$Path = (Resolve-Path -LiteralPath $Path).Path

function Invoke-Docker {
  $output = & docker @args
  if ($LASTEXITCODE -ne 0) { throw "docker $($args[0]) a échoué ($LASTEXITCODE)." }
  return $output
}

# 1. Intégrité des archives.
$sums = Get-Content -LiteralPath (Join-Path $Path "SHA256SUMS")
foreach ($line in $sums) {
  $hash, $name = $line -split '\s+', 2
  $actual = (Get-FileHash -LiteralPath (Join-Path $Path $name) -Algorithm SHA256).Hash.ToLower()
  if ($actual -ne $hash) { throw "Archive altérée : $name" }
}
Write-Host "Archives : $($sums.Count) empreinte(s) conformes."

# 2. Restauration des volumes dans des volumes temporaires.
foreach ($prefix in "media", "state") {
  if (-not (Test-Path (Join-Path $Path "$prefix.tar.gz"))) { continue }
  $temp = "portfolio_v2_verify_${prefix}_$(Get-Random)"
  Invoke-Docker volume create --label "project=portfolio-v2" --label "purpose=verify" $temp | Out-Null
  try {
    Invoke-Docker run --rm -v "${temp}:/v" -v "${Path}:/backup:ro" $HelperImage sh -c `
      "tar -xzf /backup/$prefix.tar.gz -C /v && cd /v && sha256sum --quiet -c /backup/$prefix.sha256 && find . -type f | wc -l" |
      ForEach-Object { Write-Host "Volume $prefix restauré à part : $_ fichier(s), empreintes conformes." }
  } finally {
    Invoke-Docker volume rm $temp | Out-Null
  }
}

if (-not $WithDatabase) {
  Write-Host "Base non testée (relancer avec -WithDatabase pour une restauration isolée)."
  return
}

# 3. Restauration de la base dans une instance MariaDB éphémère et isolée.
$suffix = Get-Random
$network = "portfolio_v2_verify_net_$suffix"
$container = "portfolio_v2_verify_db_$suffix"
$rootPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
Invoke-Docker network create --internal $network | Out-Null
try {
  Invoke-Docker run -d --rm --name $container --network $network --tmpfs /var/lib/mysql `
    -e "MARIADB_ROOT_PASSWORD=$rootPassword" -e MARIADB_DATABASE=portfolio_v2_restore `
    -v "${Path}:/backup:ro" $ServerImage | Out-Null
  $ready = $false
  for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
    Start-Sleep -Seconds 2
    & docker exec $container healthcheck.sh --connect --innodb_initialized 2>$null | Out-Null
    $ready = $LASTEXITCODE -eq 0
  }
  if (-not $ready) { throw "Instance de vérification non prête." }

  Invoke-Docker exec -e "MYSQL_PWD=$rootPassword" $container bash -o pipefail -c `
    "gunzip -c /backup/portfolio_v2.sql.gz | mariadb -uroot portfolio_v2_restore" | Out-Null
  $query = (
    "projects", "project_versions", "media", "version_screenshots", "site_settings",
    "contact_messages", "admin_users", "_prisma_migrations"
  ) | ForEach-Object { "SELECT '$_', COUNT(*) FROM ``$_``" } | Join-String -Separator " UNION ALL "
  Write-Host "Base restaurée à part (portfolio_v2_restore) :"
  Invoke-Docker exec -e "MYSQL_PWD=$rootPassword" $container mariadb -uroot -N portfolio_v2_restore -e $query |
    ForEach-Object { Write-Host "  $_" }
} finally {
  & docker stop $container 2>$null | Out-Null
  & docker network rm $network 2>$null | Out-Null
}
Write-Host "Vérification terminée ; instance éphémère supprimée."
