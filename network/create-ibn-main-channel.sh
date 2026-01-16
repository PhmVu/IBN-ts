#!/bin/bash
# ==============================================================================
# Create IBN-main Channel - OFFICIAL Hyperledger Fabric 2.5 Method
# ==============================================================================
# Based on: https://hyperledger-fabric.readthedocs.io/en/release-2.5/create_channel/create_channel.html
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CHANNEL_NAME="ibnmain"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Hyperledger Fabric 2.5 - Create Channel${NC}"
echo -e "${GREEN}  Channel: ${CHANNEL_NAME}${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# ==============================================================================
# STEP 1: Generate Channel Transaction using configtxgen
# ==============================================================================
echo -e "${YELLOW}[1/5] Generating channel transaction using configtxgen...${NC}"

# Use fabric-tools container (OFFICIAL METHOD)
docker run --rm -v "${SCRIPT_DIR}/configtx:/etc/hyperledger/configtx" -v "${SCRIPT_DIR}/artifacts:/artifacts" -v "${SCRIPT_DIR}/crypto-config:/crypto" hyperledger/fabric-tools:2.5.0 configtxgen -profile IBNMainChannel -outputCreateChannelTx /artifacts/${CHANNEL_NAME}.tx -channelID ${CHANNEL_NAME} -configPath /etc/hyperledger/configtx

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Channel transaction generated: ${CHANNEL_NAME}.tx${NC}"
else
  echo -e "${RED}✗ Failed to generate channel transaction${NC}"
  exit 1
fi

# ==============================================================================
# STEP 2: Create Channel on Orderer
# ==============================================================================
echo ""
echo -e "${YELLOW}[2/5] Creating channel on orderer...${NC}"

# Environment variables for peer CLI
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="IBNMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp
export CORE_PEER_ADDRESS=peer0.ibn.ictu.edu.vn:7051
export ORDERER_CA=/crypto/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp/tlscacerts/tlsca.ictu.edu.vn-cert.pem

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer channel create \
    -o orderer.ictu.edu.vn:7050 \
    -c ${CHANNEL_NAME} \
    -f /artifacts/${CHANNEL_NAME}.tx \
    --outputBlock /artifacts/${CHANNEL_NAME}.block \
    --tls \
    --cafile $ORDERER_CA

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Channel created on orderer${NC}"
else
  echo -e "${RED}✗ Failed to create channel${NC}"
  exit 1
fi

# ==============================================================================
# STEP 3: Join All Peers to Channel
# ==============================================================================
echo ""
echo -e "${YELLOW}[3/5] Joining peers to channel...${NC}"

# Join peer0
docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer channel join \
    -b /artifacts/${CHANNEL_NAME}.block

echo -e "${GREEN}✓ peer0 joined${NC}"

# Join peer1
docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer1.ibn.ictu.edu.vn/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=peer1.ibn.ictu.edu.vn:8051 \
  ibnts-peer1.ibn.ictu.edu.vn \
  peer channel join \
    -b /artifacts/${CHANNEL_NAME}.block

echo -e "${GREEN}✓ peer1 joined${NC}"

# Join peer2
docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer2.ibn.ictu.edu.vn/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=peer2.ibn.ictu.edu.vn:9051 \
  ibnts-peer2.ibn.ictu.edu.vn \
  peer channel join \
    -b /artifacts/${CHANNEL_NAME}.block

echo -e "${GREEN}✓ peer2 joined${NC}"

# ==============================================================================
# STEP 4: Update Anchor Peers
# ==============================================================================
echo ""
echo -e "${YELLOW}[4/5] Updating anchor peers...${NC}"

# Generate anchor peer update tx
docker run --rm -v "${SCRIPT_DIR}/configtx:/etc/hyperledger/configtx" -v "${SCRIPT_DIR}/artifacts:/artifacts" -v "${SCRIPT_DIR}/crypto-config:/crypto" hyperledger/fabric-tools:2.5.0 configtxgen -profile IBNMainChannel -outputAnchorPeersUpdate /artifacts/${CHANNEL_NAME}-anchors.tx -channelID ${CHANNEL_NAME} -asOrg IBNMSP -configPath /etc/hyperledger/configtx

# Update anchor peers
docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer channel update \
    -o orderer.ictu.edu.vn:7050 \
    -c ${CHANNEL_NAME} \
    -f /artifacts/${CHANNEL_NAME}-anchors.tx \
    --tls \
    --cafile $ORDERER_CA

echo -e "${GREEN}✓ Anchor peers updated${NC}"

# ==============================================================================
# STEP 5: Verify Channel
# ==============================================================================
echo ""
echo -e "${YELLOW}[5/5] Verifying channel...${NC}"

docker exec \
  -e CORE_PEER_TLS_ENABLED=$CORE_PEER_TLS_ENABLED \
  -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
  -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
  -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
  -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer channel list

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✓ Channel Created Successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Channel: ${CHANNEL_NAME}"
echo "Peers joined: peer0, peer1, peer2"
echo "Anchor peers: Updated"
echo ""
echo "Next step:"
echo "  Deploy NetworkCore chaincode:"
echo "  ./deploy-chaincode.sh network-core 0.0.3 ${CHANNEL_NAME} 1"
echo ""
