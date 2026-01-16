#!/bin/bash
# Setup script for Hyperledger Fabric Network
# This script generates crypto materials, genesis block, and channel artifacts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Hyperledger Fabric Network Setup${NC}"
echo -e "${YELLOW}========================================${NC}"

# Check if required tools are installed
check_tools() {
    echo -e "${YELLOW}[1/4] Checking required tools...${NC}"
    
    if ! command -v cryptogen &> /dev/null; then
        echo -e "${RED}✗ cryptogen not found${NC}"
        exit 1
    fi
    
    if ! command -v configtxgen &> /dev/null; then
        echo -e "${RED}✗ configtxgen not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All tools found${NC}"
}

# Generate crypto materials
generate_crypto() {
    echo -e "${YELLOW}[2/4] Generating crypto materials...${NC}"
    
    rm -rf organizations/ordererOrganizations organizations/peerOrganizations
    
    cryptogen generate --config=crypto-config.yaml --output=organizations
    
    echo -e "${GREEN}✓ Crypto materials generated${NC}"
}

# Generate genesis block
generate_genesis() {
    echo -e "${YELLOW}[3/4] Generating genesis block...${NC}"
    
    mkdir -p artifacts
    rm -f artifacts/genesis.block
    
    configtxgen -profile TwoOrgsOrdererGenesis \
        -channelID system-channel \
        -outputBlock artifacts/genesis.block
    
    echo -e "${GREEN}✓ Genesis block generated${NC}"
}

# Generate channel artifacts
generate_channels() {
    echo -e "${YELLOW}[4/4] Generating channel artifacts...${NC}"
    
    # Create testchan
    configtxgen -profile TwoOrgsChannel \
        -channelID testchan \
        -outputCreateChannelTx artifacts/testchan.tx
    
    # Create mychannel
    configtxgen -profile TwoOrgsChannel \
        -channelID mychannel \
        -outputCreateChannelTx artifacts/mychannel.tx
    
    # Generate anchor peer updates
    configtxgen -profile TwoOrgsChannel \
        -channelID testchan \
        -asOrg IBNMSP \
        -outputAnchorPeersUpdate artifacts/IBNMSPanchors.tx
    
    echo -e "${GREEN}✓ Channel artifacts generated${NC}"
}

# Main execution
check_tools
generate_crypto
generate_genesis
generate_channels

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review the generated crypto materials in organizations/"
echo "2. Review the generated artifacts in artifacts/"
echo "3. Start the network: docker-compose up -d"
echo "4. Verify network health: docker-compose ps"
echo ""
