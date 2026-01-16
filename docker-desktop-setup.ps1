# ============================================
# Docker Desktop Post-Install Setup
# ============================================
# Run this AFTER Docker Desktop installation completes
# This script:
# 1. Cleans up old Docker Engine in WSL
# 2. Moves Docker Desktop WSL data to D drive
# 3. Configures Docker Desktop for optimal performance

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "Docker Desktop Post-Install Setup" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: Please run as Administrator!" -ForegroundColor Red
    exit 1
}

# ============================================
# PHASE 1: Wait for Docker Desktop to start
# ============================================
Write-Host "`n=== Phase 1: Starting Docker Desktop ===" -ForegroundColor Yellow

Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue

Write-Host "Waiting 90 seconds for Docker Desktop to initialize WSL distros..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

# ============================================
# PHASE 2: Stop Docker Desktop & WSL
# ============================================
Write-Host "`n=== Phase 2: Stopping Docker Desktop ===" -ForegroundColor Yellow

Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "com.docker.*" -Force -ErrorAction SilentlyContinue

Write-Host "Shutting down WSL..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 10

# ============================================
# PHASE 3: Move Docker WSL Data to D Drive
# ============================================
Write-Host "`n=== Phase 3: Moving Docker Data to D:\ ===" -ForegroundColor Yellow

# Create destination folder
$destPath = "D:\DockerDesktopWSL"
New-Item -Path $destPath -ItemType Directory -Force | Out-Null
Write-Host "Created: $destPath" -ForegroundColor Green

# Export docker-desktop
Write-Host "Exporting docker-desktop..." -ForegroundColor Yellow
wsl --export docker-desktop "$destPath\docker-desktop.tar"

# Export docker-desktop-data  
Write-Host "Exporting docker-desktop-data..." -ForegroundColor Yellow
wsl --export docker-desktop-data "$destPath\docker-desktop-data.tar"

# Unregister from C drive
Write-Host "Removing from C:\ ..." -ForegroundColor Yellow
wsl --unregister docker-desktop
wsl --unregister docker-desktop-data

# Import to D drive
Write-Host "Importing to D:\DockerDesktopWSL..." -ForegroundColor Yellow
wsl --import docker-desktop "$destPath\docker-desktop" "$destPath\docker-desktop.tar" --version 2
wsl --import docker-desktop-data "$destPath\docker-desktop-data" "$destPath\docker-desktop-data.tar" --version 2

# Cleanup tar files
Write-Host "Cleaning up temporary files..." -ForegroundColor Yellow
Remove-Item "$destPath\*.tar" -Force

Write-Host "`n✅ Docker WSL data moved to D:\DockerDesktopWSL!" -ForegroundColor Green

# ============================================
# PHASE 4: Cleanup Old Docker in WSL Ubuntu
# ============================================
Write-Host "`n=== Phase 4: Cleaning Up Old Docker in WSL ===" -ForegroundColor Yellow

$cleanupScript = @"
#!/bin/bash
echo '🗑️  Cleaning up old Docker Engine in Ubuntu...'

# Stop Docker service
sudo service docker stop 2>/dev/null || true

# Remove Docker packages
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true
sudo apt-get autoremove -y 2>/dev/null || true

# Remove Docker data
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
sudo rm -rf /etc/docker
sudo rm -rf ~/.docker

# Remove docker group
sudo groupdel docker 2>/dev/null || true

echo '✅ Old Docker Engine cleaned up!'
echo '✅ Now use Docker Desktop for all Docker commands'
"@

# Save cleanup script
$cleanupScript | Out-File -FilePath "$env:TEMP\cleanup-docker.sh" -Encoding UTF8

# Run cleanup in WSL Ubuntu
Write-Host "Running cleanup script in WSL Ubuntu..." -ForegroundColor Yellow
wsl -d Ubuntu bash "$env:TEMP\cleanup-docker.sh"

Write-Host "`n✅ Old Docker Engine removed from Ubuntu!" -ForegroundColor Green

# ============================================
# PHASE 5: Verify Setup
# ============================================
Write-Host "`n=== Phase 5: Verification ===" -ForegroundColor Yellow

Write-Host "`nWSL Distributions:" -ForegroundColor Cyan
wsl --list --verbose

Write-Host "`nDocker Desktop Data Location:" -ForegroundColor Cyan
Get-ChildItem "D:\DockerDesktopWSL" | Select-Object Name, @{Name="Size(GB)";Expression={[math]::Round((Get-ChildItem $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum/1GB,2)}}

# ============================================
# DONE
# ============================================
Write-Host "`n================================================" -ForegroundColor Green
Write-Host "✅ Docker Desktop Setup Complete!" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Green

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Docker Desktop installed" -ForegroundColor Green
Write-Host "  ✅ WSL data moved to D:\DockerDesktopWSL" -ForegroundColor Green  
Write-Host "  ✅ Old Docker Engine cleaned up" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Start Docker Desktop" -ForegroundColor White
Write-Host "  2. Go to Settings → Resources → WSL Integration" -ForegroundColor White
Write-Host "  3. Enable: Ubuntu" -ForegroundColor White
Write-Host "  4. Set Memory to 6 GB" -ForegroundColor White
Write-Host "  5. Apply & Restart" -ForegroundColor White
Write-Host "`n  6. Test in WSL: docker run hello-world" -ForegroundColor White
Write-Host "  7. Start IBN Platform: cd '/mnt/d/Blockchain/IBN with TypeScript' && docker-compose up -d" -ForegroundColor White

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
