#!/bin/bash

# ============================================================================
# Deploy Chaincode Script for IBN with TypeScript
# Packages, installs, approves, and commits chaincode to channels
# ============================================================================

set -e

CHAINCODE_NAME=${1:-network-core}
CHAINCODE_VERSION=${2:-1.0}
CHANNEL_NAME=${3:-testchan}
SEQUENCE=${4:-1}

echo "🚀 IBN TypeScript - Deploy Chaincode"
echo "=========================================="
echo "Chaincode: $CHAINCODE_NAME"
echo "Version: $CHAINCODE_VERSION"
echo "Channel: $CHANNEL_NAME"
echo "Sequence: $SEQUENCE"
echo ""

# Change to network directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Chaincode path
CHAINCODE_SRC="../chaincodes/${CHAINCODE_NAME}"
CHAINCODE_LABEL="${CHAINCODE_NAME}_${CHAINCODE_VERSION}"

if [ ! -d "$CHAINCODE_SRC" ]; then
  echo "❌ Chaincode source not found: $CHAINCODE_SRC"
  exit 1
fi

echo "📂 Chaincode source: $CHAINCODE_SRC"

# Detect chaincode language
CHAINCODE_LANG="golang"
if [ -f "${CHAINCODE_SRC}/package.json" ]; then
  CHAINCODE_LANG="node"
  echo "📦 Detected: Node.js chaincode"
elif [ -f "${CHAINCODE_SRC}/go.mod" ]; then
  CHAINCODE_LANG="golang"
  echo "📦 Detected: Go chaincode"
else
  echo "⚠️  Warning: Could not detect chaincode language, defaulting to golang"
  echo "   (Looking for package.json or go.mod)"
fi

echo ""

# Environment variables
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="IBNMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp
export CORE_PEER_ADDRESS=peer0.ibn.ictu.edu.vn:7051
export ORDERER_CA=/crypto/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp/tlscacerts/tlsca.ictu.edu.vn-cert.pem

# ============================================================================
# STEP 1: Package Chaincode
# ============================================================================
echo "📦 STEP 1/6: Packaging chaincode..."
echo "-------------------------------------------"

# Create chaincode package directory
mkdir -p packages

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode package /packages/${CHAINCODE_LABEL}.tar.gz \
    --path /chaincodes/${CHAINCODE_NAME} \
    --lang ${CHAINCODE_LANG} \
    --label ${CHAINCODE_LABEL}

if [ $? -eq 0 ]; then
  echo "✅ Chaincode packaged: ${CHAINCODE_LABEL}.tar.gz"
else
  echo "❌ Failed to package chaincode"
  exit 1
fi

# ============================================================================
# STEP 2: Install Chaincode on Peer
# ============================================================================
echo ""
echo "💿 STEP 2/6: Installing chaincode on peer..."
echo "-------------------------------------------"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode install /packages/${CHAINCODE_LABEL}.tar.gz

if [ $? -eq 0 ]; then
  echo "✅ Chaincode installed on peer"
else
  echo "❌ Failed to install chaincode"
  exit 1
fi

# ============================================================================
# STEP 3: Query Installed Chaincodes
# ============================================================================
echo ""
echo "🔍 STEP 3/6: Querying installed chaincodes..."
echo "-------------------------------------------"

INSTALLED_CC=$(docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode queryinstalled)

echo "$INSTALLED_CC"

# Extract package ID
PACKAGE_ID=$(echo "$INSTALLED_CC" | grep -oP "${CHAINCODE_LABEL}:[a-f0-9]{64}" | head -1)

if [ -z "$PACKAGE_ID" ]; then
  echo "❌ Failed to extract package ID"
  exit 1
fi

echo ""
echo "✅ Package ID: $PACKAGE_ID"

# ============================================================================
# STEP 4: Approve Chaincode for Organization
# ============================================================================
echo ""
echo "✔️  STEP 4/6: Approving chaincode for organization..."
echo "-------------------------------------------"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode approveformyorg \
    -o orderer.ictu.edu.vn:7050 \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $SEQUENCE \
    --tls \
    --cafile $ORDERER_CA

if [ $? -eq 0 ]; then
  echo "✅ Chaincode approved for organization"
else
  echo "❌ Failed to approve chaincode"
  exit 1
fi

# ============================================================================
# STEP 5: Check Commit Readiness
# ============================================================================
echo ""
echo "🔍 STEP 5/6: Checking commit readiness..."
echo "-------------------------------------------"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode checkcommitreadiness \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $SEQUENCE \
    --tls \
    --cafile $ORDERER_CA \
    --output json

# ============================================================================
# STEP 6: Commit Chaincode Definition
# ============================================================================
echo ""
echo "📝 STEP 6/6: Committing chaincode definition..."
echo "-------------------------------------------"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode commit \
    -o orderer.ictu.edu.vn:7050 \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $SEQUENCE \
    --tls \
    --cafile $ORDERER_CA \
    --peerAddresses peer0.ibn.ictu.edu.vn:7051 \
    --tlsRootCertFiles $CORE_PEER_TLS_ROOTCERT_FILE

if [ $? -eq 0 ]; then
  echo "✅ Chaincode committed to channel"
else
  echo "❌ Failed to commit chaincode"
  exit 1
fi

# ============================================================================
# STEP 7: Query Committed Chaincodes
# ============================================================================
echo ""
echo "🔍 Verifying committed chaincodes..."
echo "-------------------------------------------"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode querycommitted \
    --channelID $CHANNEL_NAME

echo ""
echo "=========================================="
echo "✅ Chaincode Deployment Complete!"
echo "=========================================="
echo ""
echo "📊 Deployment Summary:"
echo "   - Chaincode: $CHAINCODE_NAME"
echo "   - Version: $CHAINCODE_VERSION"
echo "   - Channel: $CHANNEL_NAME"
echo "   - Sequence: $SEQUENCE"
echo "   - Package ID: $PACKAGE_ID"
echo ""
echo "📋 Next Steps:"
echo "1. Initialize chaincode (if needed):"
echo "   peer chaincode invoke -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '{\"function\":\"InitLedger\",\"Args\":[]}'"
echo ""
echo "2. Query chaincode:"
echo "   peer chaincode query -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '{\"function\":\"GetAllAssets\",\"Args\":[]}'"
echo ""
echo "3. Invoke chaincode:"
echo "   peer chaincode invoke -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '{\"function\":\"CreateAsset\",\"Args\":[...]}'"
echo ""
