# Commit + push automatico ao fim de cada resposta do Claude
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
Set-Location (Split-Path $PSScriptRoot -Parent)
git add -A *> $null
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -q -m ("Auto: " + (Get-Date -Format 'yyyy-MM-dd HH:mm')) *> $null
}
git push -q origin main *> $null
exit 0
