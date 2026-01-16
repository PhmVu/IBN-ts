#!/bin/bash

# ============================================================================
# Fabric Network Setup Script for IBN with TypeScript
# Generates crypto materials and channel artifacts
# ============================================================================

set -e

echo "🔧 IBN TypeScript - Fabric Network Setup"
echo "=========================================="
echo ""

# Change to network directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Working directory: $SCRIPT_DIR"
echo ""

# Clean previous artifacts
echo "🧹 Cleaning previous artifacts..."
rm -rf crypto-config artifacts organizations
mkdir -p artifacts

# ============================================================================
# STEP 1: Generate Crypto Materials
# ============================================================================
echo ""
echo "🔐 STEP 1/5: Generating crypto materials..."
echo "-------------------------------------------"

docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  hyperledger/fabric-tools:2.5 \
  cryptogen generate --config=crypto-config.yaml --output=crypto-config

# Verify crypto-config generated
if [ -d "crypto-config/ordererOrganizations" ] && [ -d "crypto-config/peerOrganizations" ]; then
  echo "✅ Crypto materials generated successfully"
  echo ""
  echo "📂 Generated structure:"
  echo "   ├── ordererOrganizations/ictu.edu.vn/"
  tree -L 2 crypto-config/ordererOrganizations/ 2>/dev/null || ls -R crypto-config/ordererOrganizations/ | head -20
  echo ""
  echo "   └── peerOrganizations/ibn.ictu.edu.vn/"
  tree -L 2 crypto-config/peerOrganizations/ 2>/dev/null || ls -R crypto-config/peerOrganizations/ | head -20
else
  echo "❌ Failed to generate crypto materials"
  exit 1
fi

# ============================================================================
# STEP 2: Copy to organizations directory (for consistency)
# ============================================================================
echo ""
echo "📋 STEP 2/5: Organizing crypto materials..."
echo "-------------------------------------------"

# Create organizations directory structure to match configtx.yaml
mkdir -p organizations
cp -r crypto-config/* organizations/ 2>/dev/null || true

echo "✅ Crypto materials organized"

# ============================================================================
# STEP 3: Generate Genesis Block (System Channel)
# ============================================================================
echo ""
echo "📦 STEP 3/5: Generating genesis block..."
echo "-------------------------------------------"

docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  -e FABRIC_CFG_PATH=/workspace \
  hyperledger/fabric-tools:2.5 \
  configtxgen \
    -profile TwoOrgsOrdererGenesis \
    -outputBlock ./artifacts/genesis.block \
    -channelID system-channel

if [ -f "artifacts/genesis.block" ]; then
  GENESIS_SIZE=$(stat -f%z artifacts/genesis.block 2>/dev/null || stat -c%s artifacts/genesis.block 2>/dev/null)
  echo "✅ Genesis block created (${GENESIS_SIZE} bytes)"
  ls -lh artifacts/genesis.block
else
  echo "❌ Failed to create genesis block"
  exit 1
fi

# ============================================================================
# STEP 4: Generate Channel Transaction Artifacts
# ============================================================================
echo ""
echo "📄 STEP 4/5: Generating channel transaction artifacts..."
echo "-------------------------------------------"

# Channels as per plan: testchan, ibnchan
CHANNELS=("testchan" "ibnchan")

for CHANNEL in "${CHANNELS[@]}"; do
  echo "   Creating ${CHANNEL}.tx..."
  
  docker run --rm \
    -v "$(pwd)":/workspace \
    -w /workspace \
    -e FABRIC_CFG_PATH=/workspace \
    hyperledger/fabric-tools:2.5 \
    configtxgen \
      -profile TwoOrgsChannel \
      -outputCreateChannelTx ./artifacts/${CHANNEL}.tx \
      -channelID ${CHANNEL}
  
  if [ -f "artifacts/${CHANNEL}.tx" ]; then
    TX_SIZE=$(stat -f%z artifacts/${CHANNEL}.tx 2>/dev/null || stat -c%s artifacts/${CHANNEL}.tx 2>/dev/null)
    echo "   ✅ ${CHANNEL}.tx created (${TX_SIZE} bytes)"
  else
    echo "   ❌ Failed to create ${CHANNEL}.tx"
    exit 1
  fi
done

# ============================================================================
# STEP 5: Generate Anchor Peer Updates
# ============================================================================
echo ""
echo "⚓ STEP 5/5: Generating anchor peer updates..."
echo "-------------------------------------------"

# Generate anchor peer update for IBNMSP on testchan
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  -e FABRIC_CFG_PATH=/workspace \
  hyperledger/fabric-tools:2.5 \
  configtxgen \
    -profile TwoOrgsChannel \
    -outputAnchorPeersUpdate ./artifacts/IBNMSPanchors.tx \
    -channelID testchan \
    -asOrg IBNMSP

if [ -f "artifacts/IBNMSPanchors.tx" ]; then
  ANCHOR_SIZE=$(stat -f%z artifacts/IBNMSPanchors.tx 2>/dev/null || stat -c%s artifacts/IBNMSPanchors.tx 2>/dev/null)
  echo "✅ Anchor peer update created (${ANCHOR_SIZE} bytes)"
else
  echo "⚠️  Anchor peer update skipped (non-critical)"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "=========================================="
echo "✅ Fabric Network Setup Complete!"
echo "=========================================="
echo ""
echo "📊 Generated Artifacts Summary:"
echo ""
echo "1️⃣  Crypto Materials:"
echo "   ├── Orderer Organization: crypto-config/ordererOrganizations/ictu.edu.vn/"
echo "   │   ├── CA certificates"
echo "   │   ├── MSP (Membership Service Provider)"
echo "   │   ├── TLS certificates"
echo "   │   └── Admin & user certificates"
echo "   └── Peer Organization: crypto-config/peerOrganizations/ibn.ictu.edu.vn/"
echo "       ├── CA certificates"
echo "       ├── MSP (Membership Service Provider)"
echo "       ├── Peer0 certificates & TLS"
echo "       └── Admin & User1 certificates"
echo ""
echo "2️⃣  Channel Artifacts:"
ls -lh artifacts/
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Review crypto materials:"
echo "   $ tree crypto-config/ -L 3"
echo ""
echo "2. Start Fabric network:"
echo "   $ docker compose up -d ca.ibn.ictu.edu.vn orderer.ibn.ictu.edu.vn peer0.ibn.ictu.edu.vn couchdb"
echo ""
echo "3. Create channels:"
echo "   $ ./scripts/create-channel.sh testchan"
echo "   $ ./scripts/create-channel.sh ibnchan"
echo ""
echo "4. Join peers to channels"
echo ""
echo "5. Deploy chaincode"
echo ""
