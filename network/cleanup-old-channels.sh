#!/bin/bash
# ============================================================================
# Clean Up Old Channels
# ============================================================================
# Removes old channel artifacts and peer ledger data
# ============================================================================

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}  Cleaning Up Old Channels${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

echo -e "${RED}⚠️  WARNING: This will delete all channel data!${NC}"
echo -e "${RED}⚠️  Press Ctrl+C to cancel, or wait 5 seconds...${NC}"
sleep 5

# Stop network
echo -e "${YELLOW}[1/4] Stopping network...${NC}"
docker-compose down
echo -e "${GREEN}✓ Network stopped${NC}"

# Remove old channel artifacts
echo ""
echo -e "${YELLOW}[2/4] Removing old channel artifacts...${NC}"
rm -f artifacts/testchan.tx
rm -f artifacts/ibnchan.tx  
rm -f artifacts/governance.tx
rm -f artifacts/*.block
echo -e "${GREEN}✓ Old artifacts removed${NC}"

# Clean peer ledger data
echo ""
echo -e "${YELLOW}[3/4] Cleaning peer ledger data...${NC}"
docker volume prune -f
echo -e "${GREEN}✓ Ledger data cleaned${NC}"

# Restart network
echo ""
echo -e "${YELLOW}[4/4] Restarting network...${NC}"
docker-compose up -d
sleep 10
echo -e "${GREEN}✓ Network restarted${NC}"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✓ Cleanup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Create IBN-main channel:"
echo "     ./create-ibn-main-channel.sh"
echo ""
