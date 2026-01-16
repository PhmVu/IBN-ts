# Phase 1 Setup Script
# Run this in PowerShell

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Phase 1: Wallet System Database Schema Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Generate encryption key
Write-Host "Step 1: Generating encryption key..." -ForegroundColor Yellow
$key = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })

Write-Host "✅ Key generated: $key" -ForegroundColor Green
Write-Host ""

# Step 2: Update .env file
Write-Host "Step 2: Updating .env file..." -ForegroundColor Yellow

$envFile = "backend-ts\.env"
$envContent = @"

# ============================================================
# Phase 1: Wallet System (Added $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
# ============================================================
WALLET_ENCRYPTION_KEY=$key

"@

if (Test-Path $envFile) {
    Add-Content -Path $envFile -Value $envContent
    Write-Host "✅ Added WALLET_ENCRYPTION_KEY to .env" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found. Creating new one..." -ForegroundColor Yellow
    Set-Content -Path $envFile -Value $envContent
    Write-Host "✅ Created .env with WALLET_ENCRYPTION_KEY" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ Phase 1 Setup Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. cd backend-ts" -ForegroundColor White
Write-Host "2. npm run db:migrate" -ForegroundColor White
Write-Host ""
