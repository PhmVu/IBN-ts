#!/bin/bash

# Phase 1: Wallet System Database Schema Setup
# Run this in WSL terminal

echo "============================================================"
echo "🚀 Phase 1: Wallet System Database Schema Setup"
echo "============================================================"
echo ""

# Step 1: Generate encryption key
echo "Step 1: Generating encryption key..."
KEY=$(openssl rand -hex 32)
echo "✅ Key generated: $KEY"
echo ""

# Step 2: Update .env file
echo "Step 2: Updating .env file..."
ENV_FILE="backend-ts/.env"

if [ -f "$ENV_FILE" ]; then
    echo "" >> "$ENV_FILE"
    echo "# ============================================================" >> "$ENV_FILE"
    echo "# Phase 1: Wallet System (Added $(date '+%Y-%m-%d %H:%M:%S'))" >> "$ENV_FILE"
    echo "# ============================================================" >> "$ENV_FILE"
    echo "WALLET_ENCRYPTION_KEY=$KEY" >> "$ENV_FILE"
    echo "✅ Added WALLET_ENCRYPTION_KEY to .env"
else
    echo "⚠️  .env file not found. Creating new one..."
    cat > "$ENV_FILE" << EOF
# ============================================================
# Phase 1: Wallet System (Created $(date '+%Y-%m-%d %H:%M:%S'))
# ============================================================
WALLET_ENCRYPTION_KEY=$KEY
EOF
    echo "✅ Created .env with WALLET_ENCRYPTION_KEY"
fi

echo ""
echo "============================================================"
echo "✅ Phase 1 Setup Complete!"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. cd backend-ts"
echo "2. npm run db:migrate"
echo ""
