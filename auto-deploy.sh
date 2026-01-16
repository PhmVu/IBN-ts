#!/bin/bash
# ============================================================================
# Auto Deploy Script for IBN Fabric Network
# ============================================================================
# This script automatically:
# 1. Starts Docker service
# 2. Starts Fabric network
# 3. Deploys NetworkCore chaincode v0.0.3
# ============================================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  IBN Fabric Network - Auto Deploy${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Step 1: Check Docker service
echo -e "${YELLOW}[1/4] Checking Docker service...${NC}"
if ! service docker status > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting Docker service...${NC}"
    sudo service docker start
    sleep 3
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Step 2: Navigate to network folder
echo -e "${YELLOW}[2/4] Navigating to network folder...${NC}"
cd "$(dirname "$0")/network"
echo -e "${GREEN}✓ Current directory: $(pwd)${NC}"
echo ""

# Step 3: Start Fabric network
echo -e "${YELLOW}[3/4] Starting Fabric network...${NC}"
./start-network.sh
echo -e "${GREEN}✓ Fabric network started${NC}"
echo ""

# Wait for network to be ready
echo -e "${YELLOW}Waiting for network to be ready (30 seconds)...${NC}"
sleep 30

# Step 4: Deploy NetworkCore chaincode
echo -e "${YELLOW}[4/4] Deploying NetworkCore chaincode v0.0.3...${NC}"
./deploy-chaincode.sh network-core 0.0.3 governance 1

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✓ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Network is ready! You can now:"
echo -e "  • Query chaincode: ${YELLOW}./network/query-chaincode.sh network-core governance GetPlatformStatistics${NC}"
echo -e "  • Check containers: ${YELLOW}docker ps${NC}"
echo -e "  • View logs: ${YELLOW}docker logs ibnts-peer0.ibn.ictu.edu.vn${NC}"
echo ""
