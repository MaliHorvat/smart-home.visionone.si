$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Na strežniku rabiš samo Node.js: https://nodejs.org"
  exit 1
}

Write-Host "Most išče releje v omrežju. To okno pusti odprto."
Write-Host "Žeton: token.txt (nastane ob prvem zagonu)"
node ".\server.mjs"
