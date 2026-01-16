#!/bin/bash
# Initialize Vault in production mode
# Run this ONCE after starting production Vault

set -e

echo "🔐 Initializing Vault in Production Mode..."
echo ""

# Wait for Vault to be ready
echo "Waiting for Vault to start..."
sleep 5

# Check if already initialized
if docker-compose exec vault vault status 2>&1 | grep -q "Initialized.*true"; then
  echo "⚠️  Vault is already initialized!"
  echo "Skipping initialization."
  exit 0
fi

# Initialize Vault (one-time)
echo "Initializing Vault with 1 key share..."
docker-compose exec vault vault operator init \
  -key-shares=1 \
  -key-threshold=1 \
  -format=json > vault-keys.json

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Vault initialized successfully!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  CRITICAL: SAVE vault-keys.json SECURELY!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📄 Keys saved to: vault-keys.json"
  echo ""
  echo "This file contains:"
  echo "  - Unseal key (required after every restart)"
  echo "  - Root token (full admin access)"
  echo ""
  echo "Next steps:"
  echo "  1. BACKUP vault-keys.json to secure location"
  echo "  2. Run: bash scripts/unseal-vault.sh"
  echo "  3. Run: bash scripts/migrate-to-prod-vault.sh"
  echo ""
else
  echo "❌ Initialization failed!"
  exit 1
fi
