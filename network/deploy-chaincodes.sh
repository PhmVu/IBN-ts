#!/bin/bash
# ============================================================================
# Deploy Chaincodes Script
# ============================================================================
# This script packages and deploys the TeaTrace and NetworkCore chaincodes
# to the Fabric network
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Configuration
PEER_ADDR="peer0.ibn.ictu.edu.vn:7051"
ORDERER_ADDR="orderer.ictu.edu.vn:7050"
CHANNEL_NAME="ibnchan"
PEER_TLSROOT_CA="$SCRIPT_DIR/organizations/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls/ca.crt"

# Chaincodes configuration
declare -A CHAINCODES=(
    ["teatrace"]="./dist/teatrace"
    ["network-core"]="./dist/network-core"
)

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_step() {
    echo -e "${YELLOW}[*] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[✓] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if chaincodes are built
    if [ ! -d "$ROOT_DIR/chaincodes/dist/teatrace" ]; then
        print_error "TeaTrace chaincode not found. Run 'npm run build' in chaincodes/teatrace first"
        exit 1
    fi
    print_success "TeaTrace chaincode found"
    
    if [ ! -d "$ROOT_DIR/chaincodes/dist/network-core" ]; then
        print_error "NetworkCore chaincode not found. Run 'npm run build' in chaincodes/network-core first"
        exit 1
    fi
    print_success "NetworkCore chaincode found"
    
    # Check if peer container is running
    if ! docker ps --filter "name=peer0.ibn.ictu.edu.vn" --filter "status=running" | grep -q "peer0.ibn.ictu.edu.vn"; then
        print_error "Peer container is not running"
        exit 1
    fi
    print_success "Peer container is running"
}

# Package chaincode
package_chaincode() {
    local chaincode_name=$1
    local chaincode_path=$2
    local version=$3
    
    print_step "Packaging chaincode: $chaincode_name (v$version)"
    
    # Create temp directory for package
    mkdir -p "$SCRIPT_DIR/temp"
    
    # Create metadata.json
    cat > "$SCRIPT_DIR/temp/metadata.json" << EOF
{
    "type": "ccaas",
    "label": "${chaincode_name}-${version}"
}
EOF
    
    # Create connection.json for chaincode as a service
    cat > "$SCRIPT_DIR/temp/connection.json" << EOF
{
    "address": "${chaincode_name}:7052",
    "dialTimeout": "10s",
    "tls": {
        "required": false
    }
}
EOF
    
    # Create the package
    cd "$SCRIPT_DIR/temp"
    tar cfz "code.tar.gz" connection.json
    tar cfz "${chaincode_name}.tar.gz" metadata.json code.tar.gz
    
    cp "${chaincode_name}.tar.gz" "$SCRIPT_DIR/${chaincode_name}.tar.gz"
    
    cd "$SCRIPT_DIR"
    rm -rf "$SCRIPT_DIR/temp"
    
    print_success "Chaincode $chaincode_name packaged"
}

# Install chaincode
install_chaincode() {
    local chaincode_name=$1
    local version=$2
    
    print_step "Installing chaincode: $chaincode_name (v$version)"
    
    docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer lifecycle chaincode install "$SCRIPT_DIR/${chaincode_name}.tar.gz" \
        --tls \
        --cafile $PEER_TLSROOT_CA
    
    print_success "Chaincode $chaincode_name installed"
}

# Query installed chaincode
query_installed() {
    local chaincode_name=$1
    
    print_step "Querying installed chaincodes for: $chaincode_name"
    
    local output=$(docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer lifecycle chaincode queryinstalled \
        --tls \
        --cafile $PEER_TLSROOT_CA)
    
    # Extract Package ID
    local package_id=$(echo "$output" | grep "${chaincode_name}" | awk '{print $3}' | cut -d',' -f1)
    
    if [ -z "$package_id" ]; then
        print_error "Failed to find package ID for $chaincode_name"
        return 1
    fi
    
    echo "$package_id"
}

# Approve chaincode
approve_chaincode() {
    local chaincode_name=$1
    local package_id=$2
    local version=$3
    
    print_step "Approving chaincode: $chaincode_name"
    
    docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer lifecycle chaincode approveformyorg \
        --channelID $CHANNEL_NAME \
        --name $chaincode_name \
        --version $version \
        --package-id $package_id \
        --sequence 1 \
        --tls \
        --cafile $PEER_TLSROOT_CA \
        --orderer $ORDERER_ADDR \
        --ordererTLSHostnameOverride orderer.ictu.edu.vn
    
    print_success "Chaincode $chaincode_name approved"
}

# Check commit readiness
check_commit_readiness() {
    local chaincode_name=$1
    local version=$2
    
    print_step "Checking commit readiness for: $chaincode_name"
    
    docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer lifecycle chaincode checkcommitreadiness \
        --channelID $CHANNEL_NAME \
        --name $chaincode_name \
        --version $version \
        --sequence 1 \
        --tls \
        --cafile $PEER_TLSROOT_CA \
        --orderer $ORDERER_ADDR \
        --ordererTLSHostnameOverride orderer.ictu.edu.vn
    
    print_success "Commit readiness checked for $chaincode_name"
}

# Commit chaincode
commit_chaincode() {
    local chaincode_name=$1
    local version=$2
    
    print_step "Committing chaincode: $chaincode_name"
    
    docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer lifecycle chaincode commit \
        --channelID $CHANNEL_NAME \
        --name $chaincode_name \
        --version $version \
        --sequence 1 \
        --tls \
        --cafile $PEER_TLSROOT_CA \
        --orderer $ORDERER_ADDR \
        --ordererTLSHostnameOverride orderer.ictu.edu.vn
    
    print_success "Chaincode $chaincode_name committed"
}

# Query committed chaincode
query_committed() {
    local chaincode_name=$1
    
    print_step "Querying committed chaincodes for: $chaincode_name"
    
    docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer lifecycle chaincode querycommitted \
        --channelID $CHANNEL_NAME \
        --name $chaincode_name \
        --tls \
        --cafile $PEER_TLSROOT_CA
    
    print_success "Query completed for $chaincode_name"
}

# Main execution
main() {
    print_header "IBN Fabric Network - Deploy Chaincodes"
    
    check_prerequisites
    
    local version="1.0"
    
    # Deploy each chaincode
    for chaincode in "${!CHAINCODES[@]}"; do
        echo ""
        
        # Package
        package_chaincode "$chaincode" "${CHAINCODES[$chaincode]}" "$version"
        
        # Install
        install_chaincode "$chaincode" "$version"
        
        # Get package ID
        package_id=$(query_installed "$chaincode")
        
        if [ -z "$package_id" ]; then
            print_error "Failed to get package ID for $chaincode. Skipping..."
            continue
        fi
        
        print_step "Package ID for $chaincode: $package_id"
        
        # Approve
        approve_chaincode "$chaincode" "$package_id" "$version"
        
        # Check readiness
        check_commit_readiness "$chaincode" "$version"
        
        # Commit
        commit_chaincode "$chaincode" "$version"
        
        # Verify
        query_committed "$chaincode"
    done
    
    echo ""
    print_success "All chaincodes deployed successfully!"
    echo ""
    echo "Deployed chaincodes:"
    for chaincode in "${!CHAINCODES[@]}"; do
        echo "  - $chaincode (v$version)"
    done
    echo ""
}

# Run main function
main
