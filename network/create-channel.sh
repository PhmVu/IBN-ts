#!/bin/bash

# ============================================================================
# Create and Join Channels Script for IBN with TypeScript
# Creates application channels and joins peer to them
# ============================================================================

set -e

CHANNEL_NAME=${1:-testchan}

echo "🔗 IBN TypeScript - Create & Join Channel"
echo "=========================================="
echo "Channel: $CHANNEL_NAME"
echo ""

# Change to network directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if channel tx exists
if [ ! -f "artifacts/${CHANNEL_NAME}.tx" ]; then
  echo "❌ Channel transaction file not found: artifacts/${CHANNEL_NAME}.tx"
  echo "Available channels:"
  ls -1 artifacts/*.tx 2>/dev/null | sed 's/.*\///' || echo "None"
  exit 1
fi

# Environment variables for peer CLI
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="IBNMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp
export CORE_PEER_ADDRESS=peer0.ibn.ictu.edu.vn:7051

# Orderer environment
export ORDERER_CA=/crypto/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp/tlscacerts/tlsca.ictu.edu.vn-cert.pem

echo "📋 Environment Configuration:"
echo "   Peer: $CORE_PEER_ADDRESS"
echo "   MSP ID: $CORE_PEER_LOCALMSPID"
echo "   Orderer CA: orderer.ictu.edu.vn:7050"
echo ""

# ============================================================================
# STEP 1: Create Channel
# ============================================================================
echo "🏗️  STEP 1/3: Creating channel '$CHANNEL_NAME'..."
echo "-------------------------------------------"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer channel create \
    -o orderer.ictu.edu.vn:7050 \
    -c $CHANNEL_NAME \
    -f /artifacts/${CHANNEL_NAME}.tx \
    --outputBlock /artifacts/${CHANNEL_NAME}.block \
    --tls \
    --cafile $ORDERER_CA

if [ $? -eq 0 ]; then
  echo "✅ Channel '$CHANNEL_NAME' created successfully"
else
  echo "❌ Failed to create channel '$CHANNEL_NAME'"
  exit 1
fi

# ============================================================================
# STEP 2: Join Peer to Channel
# ============================================================================
echo ""
echo "🔗 STEP 2/3: Joining peer to channel '$CHANNEL_NAME'..."
echo "-------------------------------------------"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer channel join \
    -b /artifacts/${CHANNEL_NAME}.block

if [ $? -eq 0 ]; then
  echo "✅ Peer joined channel '$CHANNEL_NAME' successfully"
else
  echo "❌ Failed to join peer to channel '$CHANNEL_NAME'"
  exit 1
fi

# ============================================================================
# STEP 3: Update Anchor Peers (if anchor peer tx exists)
# ============================================================================
echo ""
echo "⚓ STEP 3/3: Updating anchor peers..."
echo "-------------------------------------------"

if [ -f "artifacts/IBNMSPanchors.tx" ] && [ "$CHANNEL_NAME" = "testchan" ]; then
  docker exec \
    -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
    -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
    -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
    -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
    -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
    ibnts-peer0.ibn.ictu.edu.vn \
    peer channel update \
      -o orderer.ictu.edu.vn:7050 \
      -c $CHANNEL_NAME \
      -f /artifacts/IBNMSPanchors.tx \
      --tls \
      --cafile $ORDERER_CA

  if [ $? -eq 0 ]; then
    echo "✅ Anchor peers updated successfully"
  else
    echo "⚠️  Anchor peer update failed (non-critical)"
  fi
else
  echo "⚠️  Anchor peer update skipped (not applicable for this channel)"
fi

# ============================================================================
# STEP 4: Verify Channel Join
# ============================================================================
echo ""
echo "🔍 Verifying channel membership..."
echo "-------------------------------------------"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer channel list

echo ""
echo "=========================================="
echo "✅ Channel Setup Complete!"
echo "=========================================="
echo ""
echo "📊 Channel: $CHANNEL_NAME"
echo "   - Channel created: ✓"
echo "   - Peer joined: ✓"
echo "   - Ready for chaincode deployment"
echo ""
echo "📋 Next Steps:"
echo "1. Deploy chaincode to this channel"
echo "2. Test chaincode invocation"
echo "3. Query ledger state"
echo ""
