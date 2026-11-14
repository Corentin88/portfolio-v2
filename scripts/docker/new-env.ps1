#Requires -Version 7
<#
.SYNOPSIS
  Crée .env.docker (configuration du conteneur local) à partir de .env.docker.example
  et des valeurs du .env de développement, sans afficher aucun secret.

.DESCRIPTION
  - DATABASE_URL : même compte et même base, hôte remplacé par host.docker.internal,
    délais courts (connectTimeout=3000, acquireTimeout=5000).
  - AUTH_SECRET : nouveau secret aléatoire propre à l'environnement Docker.
  - RESEND_API_KEY, CONTACT_FROM : repris du .env.
  Refuse d'écraser un .env.docker existant.
#>
$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot/../.."
$target = Join-Path $root ".env.docker"
if (Test-Path $target) { throw ".env.docker existe déjà : rien n'est modifié." }

$dev = @{}
foreach ($line in Get-Content (Join-Path $root ".env")) {
  if ($line -match '^\s*([A-Z_]+)\s*=(.*)$') { $dev[$Matches[1]] = $Matches[2].Trim() }
}

$database = [UriBuilder]($dev.DATABASE_URL.Trim('"'))
if ($database.Path.TrimStart('/') -ne "portfolio_v2") { throw "DATABASE_URL du .env ne vise pas portfolio_v2." }
$database.Host = "host.docker.internal"
$database.Query = "connectTimeout=3000&acquireTimeout=5000"
$secret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

$values = @{
  DATABASE_URL   = $database.Uri.AbsoluteUri
  AUTH_SECRET    = $secret
  RESEND_API_KEY = $dev.RESEND_API_KEY
  CONTACT_FROM   = $dev.CONTACT_FROM
}
$lines = foreach ($line in Get-Content (Join-Path $root ".env.docker.example")) {
  $key = if ($line -match '^([A-Z_]+)=') { $Matches[1] }
  if ($key -and $values.ContainsKey($key)) { "$key=$($values[$key])" } else { $line }
}
[IO.File]::WriteAllText($target, ($lines -join "`n") + "`n")

Write-Host ".env.docker créé. Variables (valeurs masquées) :"
foreach ($line in $lines) {
  if ($line -match '^([A-Z_]+)=(.*)$') { Write-Host ("  {0} = {1}" -f $Matches[1], ($Matches[2] ? "<défini>" : "<vide>")) }
}
