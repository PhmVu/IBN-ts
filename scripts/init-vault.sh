#!/bin/bash
# Initialize and unseal Vault
# Run once after first deployment

set -e

echo "🔐 Initializing Vault..."

# Wait for Vault to be ready
echo "Waiting for Vault to start..."
until docker-compose exec -T vault vault status 2>/dev/null; do
  echo -n "."
  sleep 2
done
echo ""

# Check if already initialized
if docker-compose exec -T vault vault status | grep -q "Initialized.*true"; then
  echo "✅ Vault already initialized"
  
  # Check if sealed
  if docker-compose exec -T vault vault status | grep -q "Sealed.*true"; then
    echo "🔓 Unsealing Vault..."
    if [ -f ".vault-keys" ]; then
      UNSEAL_KEY=$(grep 'Unseal Key' .vault-keys | awk '{print $4}')
      docker-compose exec -T vault vault operator unseal "$UNSEAL_KEY"
      echo "✅ Vault unsealed"
    else
      echo "❌ Vault keys file not found. Cannot unseal."
      echo "If you lost the keys, you must reinitialize Vault (data will be lost)."
      exit 1
    fi
  else
    echo "✅ Vault already unsealed"
  fi
  
  exit 0
fi

# Initialize Vault (first time only)
echo "🔑 Initializing Vault for the first time..."
docker-compose exec -T vault vault operator init \
  -key-shares=1 \
  -key-threshold=1 \
  -format=json > .vault-keys.json

# Extract keys
UNSEAL_KEY=$(cat .vault-keys.json | jq -r '.unseal_keys_b64[0]')
ROOT_TOKEN=$(cat .vault-keys.json | jq -r '.root_token')

# Save in readable format
cat > .vault-keys << EOF
Unseal Key: $UNSEAL_KEY
Root Token: $ROOT_TOKEN

⚠️  CRITICAL: Store these keys securely!
- Unseal Key: Required to unseal Vault after restart
- Root Token: Full admin access to Vault

DO NOT commit to git!
EOF

echo ""
echo "✅ Vault keys saved to .vault-keys"
echo "⚠️  IMPORTANT: Backup this file securely!"
echo ""

# Unseal Vault
echo "🔓 Unsealing Vault..."
docker-compose exec -T vault vault operator unseal "$UNSEAL_KEY"

# Update .env with root token
ENV_FILE="backend-ts/.env"
if grep -q "VAULT_ROOT_TOKEN=" "$ENV_FILE" 2>/dev/null; then
  # Update existing line (cross-platform compatible)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/VAULT_ROOT_TOKEN=.*/VAULT_ROOT_TOKEN=$ROOT_TOKEN/" "$ENV_FILE"
  else
    # Linux
    sed -i "s/VAULT_ROOT_TOKEN=.*/VAULT_ROOT_TOKEN=$ROOT_TOKEN/" "$ENV_FILE"
  fi
else
  echo "VAULT_ROOT_TOKEN=$ROOT_TOKEN" >> "$ENV_FILE"
fi

echo "✅ Vault initialized and unsealed"
echo "✅ Root token added to backend-ts/.env"
echo ""
echo "📋 Summary:"
echo "  Root Token: $ROOT_TOKEN"
echo "  Unseal Key: $UNSEAL_KEY"
echo ""
echo "🚀 Vault is ready! Run: docker-compose exec backend-api npx ts-node src/scripts/init-vault.ts"
