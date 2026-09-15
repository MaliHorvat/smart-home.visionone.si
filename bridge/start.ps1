$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root "..")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js ni nameščen. Namesti z https://nodejs.org in ponovno zaženi."
  exit 1
}

Write-Host "Zaganjam SmartHome most na tem strežniku..."
Write-Host "Pusti to okno odprto. Žeton je v bridge\token.txt"
node "bridge\server.mjs"
