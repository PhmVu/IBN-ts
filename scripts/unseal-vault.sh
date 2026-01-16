#!/bin/bash
# Unseal Vault after restart
# Run this EVERY TIME Vault container restarts

set -e

if [ ! -f vault-keys.json ]; then
  echo "❌ vault-keys.json not found!"
  echo "Cannot unseal Vault without initialization keys."
  exit 1
fi

echo "🔓 Unsealing Vault..."

UNSEAL_KEY=$(cat vault-keys.json | jq -r '.unseal_keys_b64[0]')

if [ -z "$UNSEAL_KEY" ]; then
  echo "❌ Failed to extract unseal key from vault-keys.json"
  exit 1
fi

docker-compose exec vault vault operator unseal $UNSEAL_KEY

if [ $? -eq 0 ]; then
  echo "✅ Vault unsealed successfully"
  
  # Check status
  echo ""
  docker-compose exec vault vault status
else
  echo "❌ Unseal failed!"
  exit 1
fi
