#!/bin/bash

# Script to generate Fabric crypto materials and channel artifacts
# Using Fabric tools container - Version 2 (simplified paths)

set -e

echo "🔧 IBN Fabric Network Setup Script"
echo "===================================="
echo ""

# Change to network directory
cd "/mnt/d/Blockchain/IBN with TypeScript/network"

# Create directories
echo "📁 Creating directories..."
mkdir -p crypto-config artifacts organizations

# Step 1: Generate crypto materials using Fabric tools container
echo "🔐 Generating crypto materials (organizations)..."
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  hyperledger/fabric-tools:2.5 \
  cryptogen generate --config=crypto-config.yaml --output=crypto-config

# Verify crypto-config generated
if [ -d "crypto-config/ordererOrganizations" ] && [ -d "crypto-config/peerOrganizations" ]; then
  echo "✅ Crypto materials generated successfully"
  echo "   - ordererOrganizations:"
  ls -d crypto-config/ordererOrganizations/* 2>/dev/null | sed 's/^/     /'
  echo "   - peerOrganizations:"
  ls -d crypto-config/peerOrganizations/* 2>/dev/null | sed 's/^/     /'
else
  echo "❌ Failed to generate crypto materials"
  ls -la crypto-config/
  exit 1
fi

# Step 2: Extract TLS CA cert hash for orderer
echo ""
echo "🔗 Extracting TLS certificate hash..."

ORDERER_TLS_CERT="crypto-config/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/tls/ca.crt"

if [ -f "$ORDERER_TLS_CERT" ]; then
  TLS_CERT_HASH=$(openssl x509 -noout -fingerprint -in "$ORDERER_TLS_CERT" | awk -F= '{print $2}' | tr -d ':')
  echo "   TLS Cert Hash: $TLS_CERT_HASH"
  echo "   ✅ Certificate hash ready"
  
  # Update configtx.yaml with the TLS cert hash
  sed -i "s/ClientTLSCertHash: \"\"/ClientTLSCertHash: \"$TLS_CERT_HASH\"/g" configtx.yaml
else
  echo "   ❌ TLS certificate not found at expected location"
  exit 1
fi

# Step 3: Generate genesis block (using TwoOrgsOrdererGenesis profile)
echo ""
echo "📦 Generating genesis block..."
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  hyperledger/fabric-tools:2.5 \
  bash -c "export FABRIC_CFG_PATH=/workspace && configtxgen -profile TwoOrgsOrdererGenesis -outputBlock ./artifacts/genesis.block -channelID system-channel"

if [ -f "artifacts/genesis.block" ]; then
  echo "✅ Genesis block created"
  ls -lh artifacts/genesis.block
else
  echo "❌ Failed to create genesis block"
  exit 1
fi

# Step 4: Generate channel transaction artifacts (using TwoOrgsChannel profile)
echo ""
echo "📄 Generating channel transaction artifacts..."

CHANNELS=("testchan" "ibnchan")

for CHANNEL in "${CHANNELS[@]}"; do
  echo "   Creating $CHANNEL.tx..."
  docker run --rm \
    -v "$(pwd)":/workspace \
    -w /workspace \
    hyperledger/fabric-tools:2.5 \
    bash -c "export FABRIC_CFG_PATH=/workspace && configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./artifacts/${CHANNEL}.tx -channelID ${CHANNEL}"
  
  if [ -f "artifacts/${CHANNEL}.tx" ]; then
    echo "   ✅ $CHANNEL.tx created"
  else
    echo "   ❌ Failed to create $CHANNEL.tx"
  fi
done

# Step 5: Generate anchor peer updates
echo ""
echo "⚓ Generating anchor peer updates..."

docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  hyperledger/fabric-tools:2.5 \
  bash -c "export FABRIC_CFG_PATH=/workspace && configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./artifacts/IBNMSPanchors.tx -channelID testchan -asOrg IBNMSP"

if [ -f "artifacts/IBNMSPanchors.tx" ]; then
  echo "✅ Anchor peer configuration created"
else
  echo "⚠️  Anchor peer update may have skipped (non-critical)"
fi

# Step 6: Summary
echo ""
echo "======================================"
echo "✅ Fabric Network Setup Complete!"
echo "======================================"
echo ""
echo "📁 Generated crypto materials:"
echo "   - Orderer organization in: crypto-config/ordererOrganizations/ictu.edu.vn/"
echo "   - Peer organization in: crypto-config/peerOrganizations/ibn.ictu.edu.vn/"
echo ""
echo "📄 Generated channel artifacts:"
ls -lh artifacts/
echo ""
echo "Next steps:"
echo "1. Start Fabric network: docker compose up -d"
echo "2. Create channels: peer channel create ..."
echo "3. Join peers to channels"
echo "4. Deploy chaincode"
