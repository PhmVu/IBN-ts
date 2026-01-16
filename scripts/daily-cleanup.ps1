# ============================================
# Daily Docker Cleanup Script
# Run this at end of day to free up space
# ============================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Daily Docker Cleanup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check space before
Write-Host "Space BEFORE cleanup:" -ForegroundColor Yellow
$beforeC = (Get-PSDrive C).Free / 1GB
Write-Host "   C Drive: $([math]::Round($beforeC, 2)) GB free`n" -ForegroundColor White

# 1. Remove stopped containers
Write-Host "Step 1: Removing stopped containers..." -ForegroundColor Yellow
docker container prune -f
Start-Sleep -Seconds 1

# 2. Remove unused images (keep images being used)
Write-Host "Step 2: Removing unused images..." -ForegroundColor Yellow
docker image prune -a -f
Start-Sleep -Seconds 1

# 3. Remove unused networks
Write-Host "Step 3: Removing unused networks..." -ForegroundColor Yellow
docker network prune -f
Start-Sleep -Seconds 1

# 4. Remove build cache
Write-Host "Step 4: Removing build cache..." -ForegroundColor Yellow
docker builder prune -f
Start-Sleep -Seconds 1

# 5. Remove unused volumes (CAREFUL - only if you are sure!)
# Commented out by default for safety
# Write-Host "Step 5: Removing unused volumes..." -ForegroundColor Yellow
# docker volume prune -f

# Show results
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Docker disk usage summary
Write-Host "Docker Disk Usage:" -ForegroundColor Cyan
docker system df

# Space after
Write-Host "`nSpace AFTER cleanup:" -ForegroundColor Yellow
$afterC = (Get-PSDrive C).Free / 1GB
$freed = $afterC - $beforeC
Write-Host "   C Drive: $([math]::Round($afterC, 2)) GB free" -ForegroundColor White
Write-Host "   Freed: $([math]::Round($freed, 2)) GB`n" -ForegroundColor Green

# Log to file
$logFile = "D:\Scripts\cleanup-log.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"$timestamp - Freed: $([math]::Round($freed, 2)) GB" | Out-File $logFile -Append

Write-Host "Tip: Run this script every evening before shutdown!" -ForegroundColor Cyan
Write-Host "Log saved to: $logFile`n" -ForegroundColor Gray
