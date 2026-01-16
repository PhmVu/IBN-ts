#!/bin/bash

# ============================================================================
# Invoke Chaincode Script for IBN with TypeScript
# Invokes chaincode functions after deployment
# ============================================================================

set -e

CHAINCODE_NAME=${1:-basic}
CHANNEL_NAME=${2:-testchan}
FUNCTION=${3:-InitLedger}
PARAMS=${4:-"[]"}

echo "🔧 IBN TypeScript - Invoke Chaincode"
echo "=========================================="
echo "Chaincode: $CHAINCODE_NAME"
echo "Channel: $CHANNEL_NAME"
echo "Function: $FUNCTION"
echo "Params: $PARAMS"
echo ""

# Change to network directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Environment variables
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="IBNMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp
export CORE_PEER_ADDRESS=peer0.ibn.ictu.edu.vn:7051
export ORDERER_CA=/crypto/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp/tlscacerts/tlsca.ictu.edu.vn-cert.pem

# Build invoke command
INVOKE_CMD="peer chaincode invoke"
INVOKE_CMD="$INVOKE_CMD -o orderer.ictu.edu.vn:7050"
INVOKE_CMD="$INVOKE_CMD --channelID $CHANNEL_NAME"
INVOKE_CMD="$INVOKE_CMD --name $CHAINCODE_NAME"
INVOKE_CMD="$INVOKE_CMD --tls"
INVOKE_CMD="$INVOKE_CMD --cafile $ORDERER_CA"
INVOKE_CMD="$INVOKE_CMD --peerAddresses peer0.ibn.ictu.edu.vn:7051"
INVOKE_CMD="$INVOKE_CMD --tlsRootCertFiles $CORE_PEER_TLS_ROOTCERT_FILE"
INVOKE_CMD="$INVOKE_CMD -c '{\"function\":\"$FUNCTION\",\"Args\":$PARAMS}'"

echo "📝 Invoking chaincode..."
echo "-------------------------------------------"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  sh -c "$INVOKE_CMD"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Chaincode invoked successfully"
else
  echo ""
  echo "❌ Failed to invoke chaincode"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ Invoke Complete!"
echo "=========================================="

