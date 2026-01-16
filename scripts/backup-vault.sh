#!/bin/bash
# Daily Vault backup script
# Add to crontab: 0 2 * * * /path/to/backup-vault.sh

set -e

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/vault"

echo "📦 Backing up Vault data..."

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Backup Vault data volume
docker run --rm \
  -v ibnts_vault-data:/vault/file:ro \
  -v $(pwd)/$BACKUP_DIR:/backup \
  alpine tar czf /backup/vault-data-$DATE.tar.gz -C /vault file

if [ $? -eq 0 ]; then
  echo "✅ Vault backup created: $BACKUP_DIR/vault-data-$DATE.tar.gz"
  
  # Keep last 30 days only
  find $BACKUP_DIR -name "vault-data-*.tar.gz" -mtime +30 -delete
  echo "✅ Old backups cleaned (kept last 30 days)"
else
  echo "❌ Backup failed!"
  exit 1
fi
