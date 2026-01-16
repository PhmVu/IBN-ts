#!/bin/bash
# ============================================================================
# Hyperledger Fabric Network Reset & Proper Channel Creation
# Following Official Hyperledger Fabric 2.5 Standards
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Fabric Network Reset - Official Method${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Step 1: Stop all Fabric containers
echo -e "${YELLOW}[1/6] Stopping Fabric containers...${NC}"
docker stop ibnts-orderer.ictu.edu.vn ibnts-peer0.ibn.ictu.edu.vn ibnts-peer1.ibn.ictu.edu.vn ibnts-peer2.ibn.ictu.edu.vn || true
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

# Step 2: Remove old ledger data
echo -e "${YELLOW}[2/6] Cleaning old ledger data...${NC}"
docker rm -f ibnts-orderer.ictu.edu.vn ibnts-peer0.ibn.ictu.edu.vn ibnts-peer1.ibn.ictu.edu.vn ibnts-peer2.ibn.ictu.edu.vn || true
docker volume rm -f ibnwithtypescript_orderer-storage ibnwithtypescript_peer0-storage ibnwithtypescript_peer1-storage ibnwithtypescript_peer2-storage || true
echo -e "${GREEN}✓ Ledger data cleaned${NC}"
echo ""

# Step 3: Remove old genesis block
echo -e "${YELLOW}[3/6] Removing old genesis block...${NC}"
rm -f artifacts/genesis.block
echo -e "${GREEN}✓ Old genesis block removed${NC}"
echo ""

# Step 4: Generate NEW genesis block using configtx.yaml
echo -e "${YELLOW}[4/6] Generating NEW genesis block (Fabric 2.5 standard)...${NC}"
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  hyperledger/fabric-tools:2.5.0 \
  configtxgen \
    -profile TwoOrgsOrdererGenesis \
    -outputBlock ./artifacts/genesis.block \
    -channelID system-channel \
    -configPath /workspace

if [ -f "artifacts/genesis.block" ]; then
  echo -e "${GREEN}✓ Genesis block generated: artifacts/genesis.block${NC}"
else
  echo -e "${RED}✗ Failed to generate genesis block${NC}"
  exit 1
fi
echo ""

# Step 5: Restart network with NEW genesis block
echo -e "${YELLOW}[5/6] Restarting Fabric network...${NC}"
cd ..
docker-compose up -d ca.ibn.ictu.edu.vn orderer.ictu.edu.vn peer0.ibn.ictu.edu.vn peer1.ibn.ictu.edu.vn peer2.ibn.ictu.edu.vn

echo -e "${YELLOW}Waiting for network to initialize (30 seconds)...${NC}"
sleep 30
echo -e "${GREEN}✓ Network restarted${NC}"
echo ""

# Step 6: Verify network health
echo -e "${YELLOW}[6/6] Verifying network health...${NC}"
cd network

# Check orderer
docker logs ibnts-orderer.ictu.edu.vn --tail 5 | grep -i "Beginning to serve requests" && echo -e "${GREEN}✓ Orderer healthy${NC}" || echo -e "${YELLOW}⚠ Orderer starting...${NC}"

# Check peers
docker exec ibnts-peer0.ibn.ictu.edu.vn peer version | grep "Version:" && echo -e "${GREEN}✓ Peer0 healthy${NC}" || echo -e "${RED}✗ Peer0 unhealthy${NC}"
docker exec ibnts-peer1.ibn.ictu.edu.vn peer version | grep "Version:" && echo -e "${GREEN}✓ Peer1 healthy${NC}" || echo -e "${RED}✗ Peer1 unhealthy${NC}"
docker exec ibnts-peer2.ibn.ictu.edu.vn peer version | grep "Version:" && echo -e "${GREEN}✓ Peer2 healthy${NC}" || echo -e "${RED}✗ Peer2 unhealthy${NC}"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}✅ Network Reset Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Generate channel transaction: ./generate-channel-tx.sh ibnmain"
echo "2. Create channel: ./create-channel.sh ibnmain"
echo "3. Join additional peers to channel"
echo ""
