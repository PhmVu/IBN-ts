#!/bin/bash
# Setup automated daily backup for Vault
# Run this script once to configure cron job

echo "📅 Setting up daily Vault backups..."
echo ""

# Check if cron is available
if ! command -v crontab &> /dev/null; then
    echo "❌ crontab not found! Install cron first."
    exit 1
fi

# Get project directory
PROJECT_DIR="/mnt/d/Blockchain/IBN with TypeScript"

# Create logs directory if not exists
mkdir -p "$PROJECT_DIR/logs"

# Backup existing crontab
crontab -l > /tmp/crontab.backup 2>/dev/null || true

# Check if backup job already exists
if crontab -l 2>/dev/null | grep -q "backup-vault.sh"; then
    echo "⚠️  Vault backup cron job already exists!"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep "backup-vault"
    echo ""
    read -p "Replace existing job? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove existing backup job
    crontab -l | grep -v "backup-vault.sh" | crontab -
fi

# Add new cron job (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "# Vault daily backup (2 AM)") | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * * cd \"$PROJECT_DIR\" && bash scripts/backup-vault.sh >> logs/vault-backup.log 2>&1") | crontab -

echo "✅ Cron job added successfully!"
echo ""
echo "Schedule: Daily at 2:00 AM"
echo "Script: $PROJECT_DIR/scripts/backup-vault.sh"
echo "Log: $PROJECT_DIR/logs/vault-backup.log"
echo ""
echo "Current crontab:"
crontab -l | grep -A 1 "Vault daily backup"
echo ""
echo "To view logs:"
echo "  tail -f logs/vault-backup.log"
echo ""
echo "To manually test:"
echo "  bash scripts/backup-vault.sh"
echo ""
