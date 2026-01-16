#!/bin/bash
# Teardown script for Hyperledger Fabric Network
# This script stops and removes all containers, volumes, and generated artifacts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Hyperledger Fabric Network Teardown${NC}"
echo -e "${YELLOW}========================================${NC}"

# Stop and remove containers
echo -e "${YELLOW}[1/4] Stopping containers...${NC}"
docker-compose down 2>/dev/null || true
echo -e "${GREEN}✓ Containers stopped${NC}"

# Remove volumes
echo -e "${YELLOW}[2/4] Removing volumes...${NC}"
docker-compose down -v 2>/dev/null || true
echo -e "${GREEN}✓ Volumes removed${NC}"

# Remove generated crypto materials
echo -e "${YELLOW}[3/4] Removing crypto materials...${NC}"
rm -rf organizations/ordererOrganizations organizations/peerOrganizations
echo -e "${GREEN}✓ Crypto materials removed${NC}"

# Remove generated artifacts
echo -e "${YELLOW}[4/4] Removing artifacts...${NC}"
rm -f artifacts/genesis.block artifacts/*.tx
echo -e "${GREEN}✓ Artifacts removed${NC}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Teardown completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "To setup again, run: ./scripts/setup.sh"
echo ""
