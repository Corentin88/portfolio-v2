#Requires -Version 7
<#
.SYNOPSIS
  Copie unique et non destructive de storage/media et storage/state vers les
  volumes Docker nommés portfolio_v2_media et portfolio_v2_state.

.DESCRIPTION
  1. Inventorie les fichiers sources (nombre + SHA-256) sans les modifier.
  2. Crée les volumes s'ils n'existent pas ; refuse un volume déjà non vide.
  3. Copie via un conteneur jetable, source montée en lecture seule.
  4. Fixe propriétaire (uid 1000 = utilisateur `node` de l'image) et droits.
  5. Compare nombre de fichiers et empreintes source ↔ volume.
  Les dossiers d'origine restent intacts (copie de sécurité).
#>
param(
  [string]$Root = (Resolve-Path "$PSScriptRoot/../.."),
  [string]$HelperImage = "node:22-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee"
)
$ErrorActionPreference = "Stop"

$pairs = @(
  @{ Source = Join-Path $Root "storage/media"; Volume = "portfolio_v2_media" },
  @{ Source = Join-Path $Root "storage/state"; Volume = "portfolio_v2_state" }
)

function Invoke-Docker {
  $output = & docker @args
  if ($LASTEXITCODE -ne 0) { throw "docker $($args -join ' ') a échoué ($LASTEXITCODE)." }
  return $output
}

function Get-SourceInventory([string]$dir) {
  if (-not (Test-Path $dir)) { return @{} }
  $inventory = @{}
  Get-ChildItem -LiteralPath $dir -Recurse -File | ForEach-Object {
    $relative = [IO.Path]::GetRelativePath($dir, $_.FullName).Replace('\', '/')
    $inventory[$relative] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()
  }
  return $inventory
}

function Get-VolumeInventory([string]$volume) {
  $lines = Invoke-Docker run --rm -v "${volume}:/v:ro" $HelperImage `
    sh -c 'cd /v && find . -type f -exec sha256sum {} +'
  $inventory = @{}
  foreach ($line in $lines) {
    if ($line -match '^([0-9a-f]{64})\s+\./(.+)$') { $inventory[$Matches[2]] = $Matches[1] }
  }
  return $inventory
}

foreach ($pair in $pairs) {
  $source = $pair.Source
  $volume = $pair.Volume
  Write-Host "`n=== $volume ← $source"

  $expected = Get-SourceInventory $source
  Write-Host "Inventaire source : $($expected.Count) fichier(s)"
  $expected.Keys | Sort-Object | ForEach-Object { Write-Host "  $_" }

  $exists = (& docker volume ls -q --filter "name=^${volume}$") -eq $volume
  if ($exists) {
    $count = [int](Invoke-Docker run --rm -v "${volume}:/v:ro" $HelperImage sh -c 'find /v -mindepth 1 | wc -l')
    if ($count -gt 0) {
      Write-Warning "$volume existe déjà et contient $count entrée(s) : copie refusée (rien n'est écrasé)."
      continue
    }
  } else {
    Invoke-Docker volume create --label "project=portfolio-v2" --label "content=$($volume -replace 'portfolio_v2_','')" $volume | Out-Null
    Write-Host "Volume créé."
  }

  if ($expected.Count -gt 0 -or (Test-Path $source)) {
    # Source en lecture seule (:ro) : aucune écriture possible sur les originaux.
    Invoke-Docker run --rm -v "${source}:/src:ro" -v "${volume}:/dst" $HelperImage sh -c `
      'cp -R /src/. /dst/ && chown -R 1000:1000 /dst && find /dst -type d -exec chmod 750 {} + && find /dst -type f -exec chmod 640 {} +' | Out-Null
  }

  $actual = Get-VolumeInventory $volume
  $errors = @()
  foreach ($key in $expected.Keys) {
    if (-not $actual.ContainsKey($key)) { $errors += "absent : $key" }
    elseif ($actual[$key] -ne $expected[$key]) { $errors += "empreinte différente : $key" }
  }
  if ($actual.Count -ne $expected.Count) { $errors += "nombre : source $($expected.Count), volume $($actual.Count)" }
  if ($errors.Count -gt 0) { throw "Vérification $volume en échec :`n$($errors -join "`n")" }

  $owners = Invoke-Docker run --rm -v "${volume}:/v:ro" $HelperImage sh -c 'find /v -exec stat -c "%u:%g %a" {} + | sort | uniq -c'
  Write-Host "Vérifié : $($actual.Count) fichier(s), empreintes SHA-256 identiques."
  Write-Host "Propriétaires/droits (nombre uid:gid mode) :"
  $owners | ForEach-Object { Write-Host "  $_" }
}

Write-Host "`nTerminé. Les dossiers storage/ d'origine sont conservés intacts."
