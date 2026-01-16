#!/bin/bash
# Migrate KEK from dev Vault to production Vault
# Run this ONCE after Vault is initialized and unsealed

set -e

echo "🔄 Migrating KEK to Production Vault..."
echo ""

# Check vault-keys.json exists
if [ ! -f vault-keys.json ]; then
  echo "❌ vault-keys.json not found!"
  echo "Run init-vault-prod.sh first."
  exit 1
fi

# Check kek-backup.json exists
if [ ! -f kek-backup.json ]; then
  echo "❌ kek-backup.json not found!"
  echo "Backup KEK first."
  exit 1
fi

# Extract tokens
ROOT_TOKEN=$(cat vault-keys.json | jq -r '.root_token')
KEK=$(cat kek-backup.json | jq -r '.data.data.key')

if [ -z "$ROOT_TOKEN" ] || [ -z "$KEK" ]; then
  echo "❌ Failed to extract tokens or KEK"
  exit 1
fi

echo "✅ Tokens extracted"
echo ""

# Check if Vault is unsealed
if ! docker-compose exec vault vault status 2>&1 | grep -q "Sealed.*false"; then
  echo "❌ Vault is sealed! Run unseal-vault.sh first."
  exit 1
fi

echo "✅ Vault is unsealed"
echo ""

# Enable KV v2 engine (may already exist)
echo "Enabling KV v2 secrets engine..."
docker-compose exec -e VAULT_TOKEN=$ROOT_TOKEN vault \
  vault secrets enable -version=2 -path=secret kv 2>/dev/null || echo "  (already enabled)"

echo ""

# Migrate KEK
echo "Migrating KEK to production Vault..."
docker-compose exec -e VAULT_TOKEN=$ROOT_TOKEN vault \
  vault kv put secret/ibn/encryption-key \
  key=$KEK \
  algorithm=AES-256-GCM \
  migrated_to_prod=true \
  migrated_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ KEK migrated successfully!"
  echo ""
  
  # Verify
  echo "Verifying KEK..."
  docker-compose exec -e VAULT_TOKEN=$ROOT_TOKEN vault \
    vault kv get secret/ibn/encryption-key | head -10
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Next steps:"
  echo "  1. Update backend-ts/.env with new VAULT_ROOT_TOKEN"
  echo "  2. Restart backend: docker-compose restart backend-api"
  echo "  3. Test enrollment"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
else
  echo "❌ Migration failed!"
  exit 1
fi
