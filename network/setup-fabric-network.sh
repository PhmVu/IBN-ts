#!/bin/bash

# Setup Fabric Network for IBN with TypeScript Project
# This script generates crypto materials and channel artifacts

set -e

echo "🔧 IBN with TypeScript - Fabric Network Setup"
echo "=============================================="
echo ""

# Navigate to network directory
cd "/mnt/d/Blockchain/IBN with TypeScript/network"

# Step 1: Clean old artifacts
echo "🧹 Cleaning old artifacts..."
rm -rf crypto-config artifacts organizations
mkdir -p artifacts organizations

# Step 2: Generate crypto materials
echo ""
echo "🔐 Generating crypto materials..."
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  hyperledger/fabric-tools:2.5 \
  cryptogen generate --config=crypto-config.yaml --output=crypto-config

if [ -d "crypto-config/ordererOrganizations" ] && [ -d "crypto-config/peerOrganizations" ]; then
  echo "✅ Crypto materials generated successfully"
  echo "   - Orderer: $(ls crypto-config/ordererOrganizations/)"
  echo "   - Peer: $(ls crypto-config/peerOrganizations/)"
else
  echo "❌ Failed to generate crypto materials"
  exit 1
fi

# Step 3: Copy to organizations folder (for Fabric 2.x structure)
echo ""
echo "📋 Organizing crypto materials..."
cp -r crypto-config/ordererOrganizations organizations/
cp -r crypto-config/peerOrganizations organizations/

# Step 4: Generate genesis block
echo ""
echo "📦 Generating genesis block..."
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  -e FABRIC_CFG_PATH=/workspace \
  hyperledger/fabric-tools:2.5 \
  configtxgen -profile TwoOrgsOrdererGenesis \
    -channelID system-channel \
    -outputBlock ./artifacts/genesis.block

if [ -f "artifacts/genesis.block" ]; then
  echo "✅ Genesis block created: $(ls -lh artifacts/genesis.block | awk '{print $5}')"
else
  echo "❌ Failed to create genesis block"
  exit 1
fi

# Step 5: Generate channel transaction artifacts
echo ""
echo "📄 Generating channel transaction artifacts..."

CHANNELS=("testchan" "ibnchan")

for CHANNEL in "${CHANNELS[@]}"; do
  echo "   Creating ${CHANNEL}.tx..."
  docker run --rm \
    -v "$(pwd)":/workspace \
    -w /workspace \
    -e FABRIC_CFG_PATH=/workspace \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile TwoOrgsChannel \
      -channelID "${CHANNEL}" \
      -outputCreateChannelTx "./artifacts/${CHANNEL}.tx"
  
  if [ -f "artifacts/${CHANNEL}.tx" ]; then
    echo "   ✅ ${CHANNEL}.tx created"
  else
    echo "   ❌ Failed to create ${CHANNEL}.tx"
  fi
done

# Step 6: Generate anchor peer updates
echo ""
echo "⚓ Generating anchor peer updates..."

docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  -e FABRIC_CFG_PATH=/workspace \
  hyperledger/fabric-tools:2.5 \
  configtxgen -profile TwoOrgsChannel \
    -channelID testchan \
    -outputAnchorPeersUpdate ./artifacts/IBNMSPanchors.tx \
    -asOrg IBNMSP

if [ -f "artifacts/IBNMSPanchors.tx" ]; then
  echo "✅ Anchor peer update created"
else
  echo "⚠️  Anchor peer update may have failed (non-critical)"
fi

# Step 7: Summary
echo ""
echo "=============================================="
echo "✅ Fabric Network Setup Complete!"
echo "=============================================="
echo ""
echo "📁 Generated files:"
ls -lh artifacts/
echo ""
echo "📂 Directory structure:"
tree -L 2 organizations/ || ls -R organizations/ | head -30
echo ""
echo "Next steps:"
echo "  1. Start Fabric network: docker compose up -d ca.ibn.ictu.edu.vn orderer.ictu.edu.vn peer0.ibn.ictu.edu.vn couchdb"
echo "  2. Create channels: docker exec cli peer channel create ..."
echo "  3. Join peers to channels"
echo "  4. Deploy chaincode"
