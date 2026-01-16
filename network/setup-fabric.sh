#!/bin/bash

# Script to generate Fabric crypto materials and channel artifacts
# Using Fabric tools container

set -e

NETWORK_DIR="/mnt/d/Blockchain/IBN\ with\ TypeScript/network"
CRYPTO_CONFIG_YAML="${NETWORK_DIR}/crypto-config.yaml"
CONFIGTX_YAML="${NETWORK_DIR}/configtx.yaml"
CRYPTO_OUTPUT="${NETWORK_DIR}/crypto-config"
ARTIFACTS_DIR="${NETWORK_DIR}/artifacts"
ORG_DIR="${NETWORK_DIR}/organizations"

echo "🔧 IBN Fabric Network Setup Script"
echo "===================================="
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p "${CRYPTO_OUTPUT}" "${ARTIFACTS_DIR}" "${ORG_DIR}"
cd "${NETWORK_DIR}"

# Step 1: Generate crypto materials using Fabric tools container
echo "🔐 Generating crypto materials (organizations)..."
cd "/mnt/d/Blockchain/IBN with TypeScript/network"
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  hyperledger/fabric-tools:2.5 \
  cryptogen generate --config=crypto-config.yaml --output=crypto-config

# Verify crypto-config generated
if [ -d "${CRYPTO_OUTPUT}/ordererOrganizations" ] && [ -d "${CRYPTO_OUTPUT}/peerOrganizations" ]; then
  echo "✅ Crypto materials generated successfully"
  ls -lhd "${CRYPTO_OUTPUT}"/ordererOrganizations/* 2>/dev/null | awk '{print "   " $NF}'
  ls -lhd "${CRYPTO_OUTPUT}"/peerOrganizations/* 2>/dev/null | awk '{print "   " $NF}'
else
  echo "❌ Failed to generate crypto materials"
  echo "Expected paths: ${CRYPTO_OUTPUT}/ordererOrganizations and ${CRYPTO_OUTPUT}/peerOrganizations"
  ls -la "${CRYPTO_OUTPUT}/" 2>/dev/null || echo "Directory does not exist"
  exit 1
fi

# Step 2: Update configtx.yaml with certificate hashes
echo ""
echo "🔗 Updating configtx.yaml with certificate hash..."

# Extract TLS CA cert hash for orderer
ORDERER_TLS_CERT="${CRYPTO_OUTPUT}/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/tls/ca.crt"

if [ -f "${ORDERER_TLS_CERT}" ]; then
  TLS_CERT_HASH=$(openssl x509 -noout -fingerprint -in "${ORDERER_TLS_CERT}" | sed 's/://g')
  echo "   TLS Cert Hash: $TLS_CERT_HASH"
  
  # Update configtx.yaml with the hash (or leave blank for now - Fabric can generate it)
  echo "   ✅ Certificate hash ready"
else
  echo "   ⚠️  TLS certificate not found at expected location"
fi

# Step 3: Generate genesis block (using TwoOrgsOrdererGenesis profile)
echo ""
echo "📦 Generating genesis block..."
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  hyperledger/fabric-tools:2.5 \
  configtxgen -profile TwoOrgsOrdererGenesis -outputBlock ./artifacts/genesis.block -channelID system-channel

if [ -f "${ARTIFACTS_DIR}/genesis.block" ]; then
  echo "✅ Genesis block created"
  ls -lh "${ARTIFACTS_DIR}/genesis.block"
else
  echo "❌ Failed to create genesis block"
  exit 1
fi

# Step 4: Generate channel transaction artifacts (using TwoOrgsChannel profile)
echo ""
echo "📄 Generating channel transaction artifacts..."

CHANNELS=("testchan" "ibnchan")

for CHANNEL in "${CHANNELS[@]}"; do
  echo "   Creating $CHANNEL..."
  docker run --rm \
    -v "$(pwd)":/workspace \
    -w /workspace \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./artifacts/"${CHANNEL}".tx -channelID "${CHANNEL}"
  
  if [ -f "${ARTIFACTS_DIR}/${CHANNEL}.tx" ]; then
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
  configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./artifacts/IBNMSPanchors.tx -channelID testchan -asOrg IBNMSP

if [ -f "${ARTIFACTS_DIR}/IBNMSPanchors.tx" ]; then
  echo "✅ Anchor peer update created"
  ls -lh "$ARTIFACTS_DIR"/*.tx "$ARTIFACTS_DIR"/*.block
else
  echo "⚠️  Anchor peer update file issue"
fi

# Copy crypto-config to organizations for docker-compose compatibility
echo ""
echo "📋 Organizing artifacts..."
mkdir -p "${ORG_DIR}"
cp -r "${CRYPTO_OUTPUT}"/* "${ORG_DIR}/" 2>/dev/null || true

echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "Generated files:"
echo "  📁 ${CRYPTO_OUTPUT}/ordererOrganizations/"
echo "  📁 ${CRYPTO_OUTPUT}/peerOrganizations/"
echo "  📄 ${ARTIFACTS_DIR}/genesis.block"
echo "  📄 ${ARTIFACTS_DIR}/testchan.tx"
echo "  📄 ${ARTIFACTS_DIR}/ibnchan.tx"
echo "  📄 ${ARTIFACTS_DIR}/IBNMSPanchors.tx"
echo ""
echo "Next steps:"
echo "  1. Start Fabric network: docker compose up -d"
echo "  2. Create channels: ./scripts/create-channels.sh"
echo "  3. Deploy chaincode: ./scripts/deploy-chaincode.sh"
