# scripts/deploy-umbrel.ps1
# Deploy ultra-seguro para o Umbrel sem sobreescrever dados de evolução do usuário

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$projectRoot\package.json")) {
    $projectRoot = $PSScriptRoot
}

Write-Host "==> 1. Compilando Next.js..." -ForegroundColor Cyan
Set-Location $projectRoot
npm run build

Write-Host "==> 2. Preparando arquivos standalone..." -ForegroundColor Cyan
if (-not (Test-Path "$projectRoot\.next\standalone\.next\static")) {
    New-Item -ItemType Directory -Path "$projectRoot\.next\standalone\.next\static" -Force | Out-Null
}
Copy-Item -Path "$projectRoot\.next\static\*" -Destination "$projectRoot\.next\standalone\.next\static" -Recurse -Force

if (Test-Path "$projectRoot\public") {
    Copy-Item -Path "$projectRoot\public" -Destination "$projectRoot\.next\standalone" -Recurse -Force
}

# Corrige required-server-files.json para caminhos do Linux no Umbrel
$reqPath = "$projectRoot\.next\standalone\.next\required-server-files.json"
if (Test-Path $reqPath) {
    $json = Get-Content $reqPath -Raw
    $fixedJson = $json.Replace("C:\\Users\\renat\\OneDrive\\Documentos\\projetos\\app-tv-pessoal", "/home/umbrel/apps/app-tv-pessoal/.next/standalone").Replace("C:/Users/renat/OneDrive/Documentos/projetos/app-tv-pessoal", "/home/umbrel/apps/app-tv-pessoal/.next/standalone").Replace("\", "/")
    Set-Content -Path $reqPath -Value $fixedJson -NoNewline
}

# NUNCA enviar pasta data do Windows para o Umbrel
if (Test-Path "$projectRoot\.next\standalone\data") {
    Remove-Item -Path "$projectRoot\.next\standalone\data" -Recurse -Force
}

Write-Host "==> 3. Empacotando e enviando para o Umbrel..." -ForegroundColor Cyan
$archivePath = "$projectRoot\deploy-temp.tar.gz"
tar -czf $archivePath -C "$projectRoot\.next\standalone" .

scp $archivePath umbrel@umbrel.local:/tmp/deploy-temp.tar.gz
Remove-Item $archivePath -Force

Write-Host "==> 4. Atualizando serviço e reiniciando..." -ForegroundColor Cyan
ssh umbrel@umbrel.local "tar -xzf /tmp/deploy-temp.tar.gz -C /home/umbrel/apps/app-tv-pessoal/.next/standalone && rm -f /tmp/deploy-temp.tar.gz && ln -sf /home/umbrel/apps/app-tv-pessoal/storage /home/umbrel/apps/app-tv-pessoal/.next/standalone/data && systemctl --user stop app-tv-pessoal.service ; fuser -k -9 8083/tcp ; sleep 1 ; systemctl --user start app-tv-pessoal.service"

Write-Host "==> 5. Verificando integridade..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
$check = Invoke-RestMethod -Uri "http://192.168.31.204:8083/api/workout"
Write-Host "OK! App ativo! Ciclo atual: $($check.currentCycle) • Minutos treinados: $($check.metrics.totalMinutesTrained)" -ForegroundColor Green
