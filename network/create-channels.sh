#!/bin/bash
# ============================================================================
# Create Fabric Channels Script
# ============================================================================
# This script creates and joins channels to the peer
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

# Configuration
CA_ADDR="ca.ibn.ictu.edu.vn:7054"
ORDERER_ADDR="orderer.ictu.edu.vn:7050"
PEER_ADDR="peer0.ibn.ictu.edu.vn:7051"
PEER_TLSROOT_CA="$SCRIPT_DIR/organizations/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls/ca.crt"

# Channels to create
declare -a CHANNELS=("ibnchan" "testchan")

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
    
    # Check if crypto materials exist
    if [ ! -f "$PEER_TLSROOT_CA" ]; then
        print_error "TLS certificate not found at $PEER_TLSROOT_CA"
        exit 1
    fi
    print_success "Crypto materials found"
    
    # Check if channel artifacts exist
    if [ ! -f "$SCRIPT_DIR/artifacts/ibnchan.tx" ]; then
        print_error "Channel artifact ibnchan.tx not found"
        exit 1
    fi
    print_success "Channel artifacts found"
}

# Create channel
create_channel() {
    local channel=$1
    
    print_step "Creating channel: $channel"
    
    # Use docker exec to run peer CLI inside peer container
    docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer channel create \
        -o $ORDERER_ADDR \
        -c $channel \
        -f /var/hyperledger/configtx/${channel}.tx \
        --tls \
        --cafile $PEER_TLSROOT_CA
    
    print_success "Channel $channel created"
}

# Join channel
join_channel() {
    local channel=$1
    
    print_step "Joining channel: $channel"
    
    # Check if channel block exists
    if ! docker exec peer0.ibn.ictu.edu.vn test -f /var/hyperledger/production/${channel}.block; then
        print_error "Channel block for $channel not found in peer container"
        return 1
    fi
    
    # Join peer to channel
    docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer channel join \
        -b /var/hyperledger/production/${channel}.block \
        --tls \
        --cafile $PEER_TLSROOT_CA
    
    print_success "Peer joined channel $channel"
}

# Update anchor peer
update_anchor_peer() {
    local channel=$1
    local anchor_tx="IBNMSPanchors.tx"
    
    print_step "Updating anchor peer for channel: $channel"
    
    docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer channel update \
        -o $ORDERER_ADDR \
        -c $channel \
        -f /var/hyperledger/configtx/${anchor_tx} \
        --tls \
        --cafile $PEER_TLSROOT_CA
    
    print_success "Anchor peer updated for channel $channel"
}

# Verify channel
verify_channel() {
    local channel=$1
    
    print_step "Verifying channel: $channel"
    
    # List channels
    docker exec -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg peer0.ibn.ictu.edu.vn \
        peer channel list \
        --tls \
        --cafile $PEER_TLSROOT_CA
}

# Main execution
main() {
    print_header "IBN Fabric Network - Create Channels"
    
    check_prerequisites
    
    for channel in "${CHANNELS[@]}"; do
        echo ""
        
        # Create channel
        create_channel $channel || {
            print_error "Failed to create channel $channel"
            continue
        }
        
        # Wait for block to be created
        sleep 3
        
        # Join channel
        join_channel $channel || {
            print_error "Failed to join channel $channel"
            continue
        }
        
        # Update anchor peer
        update_anchor_peer $channel || {
            print_error "Failed to update anchor peer for $channel"
            continue
        }
        
        # Verify
        verify_channel $channel
    done
    
    echo ""
    print_success "All channels created and peer joined successfully!"
    echo ""
    echo "Available channels:"
    for channel in "${CHANNELS[@]}"; do
        echo "  - $channel"
    done
    echo ""
}

# Run main function
main
