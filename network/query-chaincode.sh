#!/bin/bash

# ============================================================================
# Query Chaincode Script for IBN with TypeScript
# Queries chaincode functions (read-only operations)
# ============================================================================

set -e

CHAINCODE_NAME=${1:-basic}
CHANNEL_NAME=${2:-testchan}
FUNCTION=${3:-GetAllAssets}
PARAMS=${4:-"[]"}

echo "🔍 IBN TypeScript - Query Chaincode"
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

# Build query command
QUERY_CMD="peer chaincode query"
QUERY_CMD="$QUERY_CMD --channelID $CHANNEL_NAME"
QUERY_CMD="$QUERY_CMD --name $CHAINCODE_NAME"
QUERY_CMD="$QUERY_CMD -c '{\"function\":\"$FUNCTION\",\"Args\":$PARAMS}'"

echo "📝 Querying chaincode..."
echo "-------------------------------------------"

RESULT=$(docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  sh -c "$QUERY_CMD")

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Query successful"
  echo ""
  echo "📊 Result:"
  echo "-------------------------------------------"
  echo "$RESULT" | jq '.' 2>/dev/null || echo "$RESULT"
  echo ""
else
  echo ""
  echo "❌ Failed to query chaincode"
  exit 1
fi

echo "=========================================="
echo "✅ Query Complete!"
echo "=========================================="

