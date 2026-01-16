#!/bin/bash
# ============================================================================
# Generate Channel Transaction - Official Hyperledger Fabric Method
# ============================================================================

set -e

CHANNEL_NAME=${1:-ibnmain}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Generating channel transaction: ${CHANNEL_NAME}${NC}"

# Validate channel name (lowercase alphanumeric only)
if ! [[ "$CHANNEL_NAME" =~ ^[a-z][a-z0-9]*$ ]]; then
  echo -e "${RED}Error: Channel name must be lowercase alphanumeric only${NC}"
  exit 1
fi

# Generate channel transaction
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  hyperledger/fabric-tools:2.5.0 \
  configtxgen \
    -profile TwoOrgsChannel \
    -outputCreateChannelTx ./artifacts/${CHANNEL_NAME}.tx \
    -channelID ${CHANNEL_NAME} \
    -configPath /workspace

if [ -f "artifacts/${CHANNEL_NAME}.tx" ]; then
  echo -e "${GREEN}✓ Channel transaction generated: artifacts/${CHANNEL_NAME}.tx${NC}"
else
  echo -e "${RED}✗ Failed to generate channel transaction${NC}"
  exit 1
fi

# Generate anchor peer update (optional but recommended)
echo -e "${YELLOW}Generating anchor peer update transaction...${NC}"
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  hyperledger/fabric-tools:2.5.0 \
  configtxgen \
    -profile TwoOrgsChannel \
    -outputAnchorPeersUpdate ./artifacts/${CHANNEL_NAME}-anchors.tx \
    -channelID ${CHANNEL_NAME} \
    -asOrg IBNMSP \
    -configPath /workspace

if [ -f "artifacts/${CHANNEL_NAME}-anchors.tx" ]; then
  echo -e "${GREEN}✓ Anchor peer transaction generated: artifacts/${CHANNEL_NAME}-anchors.tx${NC}"
fi

echo ""
echo -e "${GREEN}✅ Ready to create channel: ./create-channel.sh ${CHANNEL_NAME}${NC}"
