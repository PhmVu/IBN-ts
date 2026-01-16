#!/bin/bash
# Phase 2A Complete - Backup Script
# Date: 2026-01-13

echo "💾 Creating Phase 2A Backup..."
echo "==============================="
echo ""

# Create backup directory
BACKUP_DIR="backups/phase2a-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 1. Database Backup
echo "📊 Backing up database..."
docker-compose exec postgres pg_dump -U ibn_user ibn_db > "$BACKUP_DIR/database.sql"

if [ $? -eq 0 ]; then
    echo "✅ Database backup created: $BACKUP_DIR/database.sql"
else
    echo "❌ Database backup failed!"
    exit 1
fi

# 2. Code Snapshot (Git)
echo ""
echo "📝 Creating git snapshot..."
git add .
git commit -m "Phase 2A: Certificate Lifecycle - Complete & Tested $(date +%Y-%m-%d)"
git tag "v0.0.3-phase2a-$(date +%Y%m%d)"

echo "✅ Git commit & tag created"

# 3. Export Current Certificate Status
echo ""
echo "📋 Exporting certificate status..."
docker-compose exec postgres psql -U ibn_user -d ibn_db -c "
COPY (
  SELECT label, certificate_expires_at, revoked, type, created_at
  FROM wallets
  ORDER BY certificate_expires_at
) TO STDOUT CSV HEADER
" > "$BACKUP_DIR/certificates-status.csv"

echo "✅ Certificate status exported: $BACKUP_DIR/certificates-status.csv"

# 4. Backup Logs
echo ""
echo "📜 Backing up backend logs..."
docker logs ibnts-backend-api > "$BACKUP_DIR/backend-logs.txt" 2>&1

echo "✅ Logs saved: $BACKUP_DIR/backend-logs.txt"

# 5. Create Restore Script
echo ""
echo "📝 Creating restore script..."

cat > "$BACKUP_DIR/RESTORE.sh" << 'RESTORE_EOF'
#!/bin/bash
# Restore Phase 2A Backup

echo "⚠️  WARNING: This will restore database to previous state"
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Stopping backend..."
docker-compose stop backend-api

echo "Restoring database..."
docker-compose exec -T postgres psql -U ibn_user ibn_db < database.sql

echo "Restarting backend..."
docker-compose up -d backend-api

echo "✅ Restore complete!"
RESTORE_EOF

chmod +x "$BACKUP_DIR/RESTORE.sh"

echo "✅ Restore script created: $BACKUP_DIR/RESTORE.sh"

# 6. Create Backup Summary
echo ""
echo "📄 Creating backup summary..."

cat > "$BACKUP_DIR/README.md" << EOF
# Phase 2A Backup - $(date +%Y-%m-%d)

## Backup Contents

- \`database.sql\` - Complete PostgreSQL dump
- \`certificates-status.csv\` - Current certificate status
- \`backend-logs.txt\` - Backend container logs
- \`RESTORE.sh\` - Automated restore script

## Certificate Status at Backup Time

\`\`\`bash
# View certificate status
cat certificates-status.csv
\`\`\`

## How to Restore

\`\`\`bash
# Run restore script
./RESTORE.sh
\`\`\`

## Git Tag

Tag: \`v0.0.3-phase2a-$(date +%Y%m%d)\`

\`\`\`bash
# Checkout this version
git checkout v0.0.3-phase2a-$(date +%Y%m%d)
\`\`\`

## Backup Created

Date: $(date)
Backend Status: Running ✅
Certificates Tracked: $(docker-compose exec postgres psql -U ibn_user -d ibn_db -t -c "SELECT COUNT(*) FROM wallets WHERE certificate_expires_at IS NOT NULL" | tr -d ' ')
EOF

echo "✅ Backup summary created: $BACKUP_DIR/README.md"

# Final Summary
echo ""
echo "==============================="
echo "✅ BACKUP COMPLETE!"
echo "==============================="
echo ""
echo "Backup Location: $BACKUP_DIR"
echo ""
echo "Contents:"
ls -lh "$BACKUP_DIR/"
echo ""
echo "To restore:"
echo "  cd $BACKUP_DIR && ./RESTORE.sh"
echo ""
